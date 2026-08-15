import { FastifyPluginAsync } from 'fastify';
import z from 'zod';
import supabase from '../lib/supabase.js';
import { authGuard } from '../middleware/auth-guard.js';
import { generateApiKey } from '../lib/auth.js';

const createKeySchema = z.object({
  key_type: z.enum(['public', 'private']),
  label: z.string().optional(),
});

export const apiKeyRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', authGuard);

  fastify.post('/api/sites/:id/keys', async (request, reply) => {
    const { id } = request.params as { id: string };
    const parseResult = createKeySchema.safeParse(request.body);
    
    if (!parseResult.success) {
      return reply.status(400).send({ error: 'Bad Request' });
    }

    const { key_type, label } = parseResult.data;
    const prefix = key_type === 'public' ? 'pk_live_' : 'sk_live_';
    const { fullKey, keyHash, keyPreview } = generateApiKey(prefix);

    const { data, error } = await supabase
      .from('api_keys')
      .insert({
        site_id: id,
        key_hash: keyHash,
        key_preview: keyPreview,
        key_type,
        label: label || `New ${key_type} key`
      })
      .select()
      .single();

    if (error) {
      return reply.status(500).send({ error: 'Failed to create key' });
    }

    return reply.status(201).send({
      message: 'Key created',
      key: data,
      fullKey // Only returned once!
    });
  });

  fastify.get('/api/sites/:id/keys', async (request, reply) => {
    const { id } = request.params as { id: string };
    
    const { data, error } = await supabase
      .from('api_keys')
      .select('id, key_preview, key_type, label, created_at, revoked_at, expires_at')
      .eq('site_id', id)
      .is('revoked_at', null);

    if (error) return reply.status(500).send({ error: 'Failed to fetch keys' });
    
    return reply.send(data);
  });

  fastify.delete('/api/sites/:id/keys/:keyId', async (request, reply) => {
    const { id, keyId } = request.params as { id: string, keyId: string };
    
    const { error } = await supabase
      .from('api_keys')
      .update({ revoked_at: new Date().toISOString() })
      .eq('id', keyId)
      .eq('site_id', id);

    if (error) return reply.status(500).send({ error: 'Failed to revoke key' });
    
    return reply.send({ message: 'Key revoked successfully' });
  });
};
