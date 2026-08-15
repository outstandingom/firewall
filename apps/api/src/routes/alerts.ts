import { FastifyPluginAsync } from 'fastify';
import { authGuard } from '../middleware/auth-guard.js';
import supabase from '../lib/supabase.js';

export const alertRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', authGuard);

  fastify.post('/api/sites/:id/alerts', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as any;
    
    const { data, error } = await supabase
      .from('alert_rules')
      .insert({ ...body, site_id: id })
      .select()
      .single();

    if (error) return reply.status(500).send({ error: error.message });
    return reply.status(201).send(data);
  });

  fastify.get('/api/sites/:id/alerts', async (request, reply) => {
    const { id } = request.params as { id: string };
    
    const { data, error } = await supabase
      .from('alert_rules')
      .select('*')
      .eq('site_id', id);

    if (error) return reply.status(500).send({ error: error.message });
    return reply.send(data);
  });
};
