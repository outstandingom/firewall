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
    return reply.status(401).send({ error: 'Unauthorized', message: 'Missing Site Key' });
  }

  const { allowed, remaining, resetMs } = globalRateLimiter.checkRateLimit(`site_key:${apiKey}`, 1000, 60000);

  reply.header('X-RateLimit-Limit', 1000);
  reply.header('X-RateLimit-Remaining', remaining);
  reply.header('X-RateLimit-Reset', resetMs);

  if (!allowed) {
    return reply.status(429).send({ error: 'Too Many Requests', message: 'Rate limit exceeded for this site key' });
  }

  const keyHash = hashApiKey(apiKey);

  const { data: keyData, error } = await supabase
    .from('api_keys')
    .select('site_id, key_type, revoked_at, expires_at, sites(organization_id)')
    .eq('key_hash', keyHash)
    .single();

  if (error || !keyData) {
    return reply.status(401).send({ error: 'Unauthorized', message: 'Invalid Site Key' });
  }

  if (keyData.key_type !== 'public') {
    return reply.status(403).send({ error: 'Forbidden', message: 'Public site key required for this endpoint' });
  }

  if (keyData.revoked_at || (keyData.expires_at && new Date(keyData.expires_at) < new Date())) {
    return reply.status(401).send({ error: 'Unauthorized', message: 'Site Key revoked or expired' });
  }

  request.site_id = keyData.site_id;
  request.organization_id = (keyData.sites as any)?.organization_id;
}
