import { FastifyPluginAsync } from 'fastify';
import { siteKeyAuth } from '../middleware/site-key-auth.js';
import { eventQueue } from '../lib/queue.js';
import z from 'zod';

const eventSchema = z.object({
  type: z.string(),
  timestamp: z.string().datetime().optional().default(() => new Date().toISOString()),
  session_id: z.string().optional(),
  visitor_id: z.string().optional(),
  url: z.string().url().optional(),
  payload: z.any().optional(),
});

const batchEventSchema = z.object({
  events: z.array(eventSchema).max(100)
});

export const ingestionRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', siteKeyAuth);

  const enrichEvent = (event: any, request: any) => ({
    ...event,
    site_id: request.site_id,
    ip_address: request.ip,
    user_agent: request.headers['user-agent'],
    received_at: new Date().toISOString()
  });

  fastify.post('/v1/events', async (request, reply) => {
    const parseResult = eventSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({ error: 'Invalid event format', details: parseResult.error.format() });
    }

    const event = enrichEvent(parseResult.data, request);
    eventQueue.push([event]);
    
    return reply.status(202).send({ message: 'Accepted' });
  });

  fastify.post('/v1/events/batch', async (request, reply) => {
    const parseResult = batchEventSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({ error: 'Invalid batch format', details: parseResult.error.format() });
    }

    const events = parseResult.data.events.map(e => enrichEvent(e, request));
    eventQueue.push(events);
    
    return reply.status(202).send({ message: 'Accepted', count: events.length });
  });

  fastify.post('/v1/heartbeat', async (request, reply) => {
    const event = enrichEvent({ type: 'heartbeat', ...request.body as any }, request);
    eventQueue.push([event]);
    return reply.status(200).send({ message: 'OK' });
  });
};
