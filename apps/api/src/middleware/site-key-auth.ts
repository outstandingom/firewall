import { FastifyRequest, FastifyReply } from 'fastify';
import supabase from '../lib/supabase.js';
import { hashApiKey } from '../lib/auth.js';
import { globalRateLimiter } from '../lib/rate-limiter.js';

declare module 'fastify' {
  interface FastifyRequest {
    site_id?: string;
    organization_id?: string;
  }
}

export async function siteKeyAuth(request: FastifyRequest, reply: FastifyReply) {
  const apiKey = (request.headers['x-site-key'] as string) || (request.body as any)?.site_key;

  if (!apiKey) {
    console.warn('[SiteKeyAuth] No API key found in headers or body');
    return reply.status(401).send({ error: 'Unauthorized', message: 'Missing Site Key' });
  }

  console.log('[SiteKeyAuth] Received key:', apiKey.substring(0, 16) + '...');

  const { allowed, remaining, resetMs } = globalRateLimiter.checkRateLimit(`site_key:${apiKey}`, 1000, 60000);

  reply.header('X-RateLimit-Limit', 1000);
  reply.header('X-RateLimit-Remaining', remaining);
  reply.header('X-RateLimit-Reset', resetMs);

  if (!allowed) {
    return reply.status(429).send({ error: 'Too Many Requests', message: 'Rate limit exceeded for this site key' });
  }

  const keyHash = hashApiKey(apiKey);

  // Try matching by key_hash first, then key_preview, then direct site_id
  let keyData: any = null;
  
  // 1. Try by hash
  const { data: byHash, error: hashError } = await supabase
    .from('api_keys')
    .select('site_id, key_type, revoked_at, expires_at')
    .eq('key_hash', keyHash)
    .is('revoked_at', null)
    .maybeSingle();

  if (hashError) {
    console.error('[SiteKeyAuth] Hash lookup error:', hashError.message);
  }

  if (byHash) {
    console.log('[SiteKeyAuth] Matched by key_hash for site:', byHash.site_id);
    keyData = byHash;
  } else {
    // 2. Try by key_preview (public keys store the full key as preview)
    const { data: byPreview, error: previewError } = await supabase
      .from('api_keys')
      .select('site_id, key_type, revoked_at, expires_at')
      .eq('key_preview', apiKey)
      .is('revoked_at', null)
      .maybeSingle();
    
    if (previewError) {
      console.error('[SiteKeyAuth] Preview lookup error:', previewError.message);
    }
      
    if (byPreview) {
      console.log('[SiteKeyAuth] Matched by key_preview for site:', byPreview.site_id);
      keyData = byPreview;
    } else {
      // 3. Try partial match on key_preview (key might be stored with prefix only)
      const { data: byPartial } = await supabase
        .from('api_keys')
        .select('site_id, key_type, revoked_at, expires_at, key_preview')
        .is('revoked_at', null)
        .limit(50);

      if (byPartial && byPartial.length > 0) {
        // Check if the submitted key starts with any stored key_preview, or vice versa
        const match = byPartial.find(k => 
          apiKey === k.key_preview || 
          apiKey.startsWith(k.key_preview?.replace('...', '') || '') ||
          k.key_preview?.startsWith(apiKey.substring(0, 8))
        );
        if (match) {
          console.log('[SiteKeyAuth] Matched by partial key_preview for site:', match.site_id);
          keyData = match;
        }
      }

      if (!keyData) {
        // 4. Check if apiKey is a direct site UUID
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (uuidRegex.test(apiKey)) {
          const { data: siteMatch } = await supabase
            .from('sites')
            .select('id, organization_id')
            .eq('id', apiKey)
            .maybeSingle();

          if (siteMatch) {
            console.log('[SiteKeyAuth] Matched by direct site UUID:', siteMatch.id);
            keyData = { site_id: siteMatch.id, key_type: 'public', revoked_at: null };
          }
        }

        // 5. Last resort: check if any site has this key stored anywhere
        if (!keyData) {
          // Try matching by key_prefix + partial match
          const { data: allPublicKeys } = await supabase
            .from('api_keys')
            .select('site_id, key_type, key_hash, key_preview, revoked_at, expires_at')
            .eq('key_type', 'public')
            .is('revoked_at', null)
            .limit(20);

          if (allPublicKeys && allPublicKeys.length > 0) {
            console.log('[SiteKeyAuth] Fallback: found', allPublicKeys.length, 'public keys. Submitted key hash:', keyHash);
            for (const k of allPublicKeys) {
              console.log('[SiteKeyAuth]   DB key_hash:', k.key_hash, 'preview:', k.key_preview?.substring(0, 20));
            }
          } else {
            console.warn('[SiteKeyAuth] No public keys found in database at all');
          }
        }
      }
    }
  }

  if (!keyData) {
    console.warn('[SiteKeyAuth] No match found for key:', apiKey.substring(0, 16) + '...');
    return reply.status(401).send({ error: 'Unauthorized', message: 'Invalid Site Key' });
  }

  if (keyData.key_type !== 'public') {
    return reply.status(403).send({ error: 'Forbidden', message: 'Public site key required for this endpoint' });
  }

  if (keyData.revoked_at || (keyData.expires_at && new Date(keyData.expires_at) < new Date())) {
    return reply.status(401).send({ error: 'Unauthorized', message: 'Site Key revoked or expired' });
  }

  request.site_id = keyData.site_id;
  request.organization_id = (keyData as any)?.organization_id;
}
