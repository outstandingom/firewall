import { FastifyPluginAsync } from 'fastify';
import { authGuard } from '../middleware/auth-guard.js';
import { EventEmitter } from 'events';

export const sseEmitter = new EventEmitter();

export const sseRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/api/sites/:id/stream', { preHandler: [authGuard] }, async (request, reply) => {
    const { id } = request.params as { id: string };

    reply.raw.setHeader('Content-Type', 'text/event-stream');
    reply.raw.setHeader('Cache-Control', 'no-cache');
    reply.raw.setHeader('Connection', 'keep-alive');
    reply.raw.setHeader('Access-Control-Allow-Origin', '*');
    reply.raw.flushHeaders();

    const sendEvent = (data: any) => {
      reply.raw.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    // Initial payload
    sendEvent({ type: 'connected', siteId: id });

    const heartbeat = setInterval(() => {
      reply.raw.write(': heartbeat\n\n');
    }, 30000);

    const onSiteEvent = (data: any) => {
      if (data.siteId === id) {
        sendEvent(data.payload);
      }
    };

    sseEmitter.on('site_update', onSiteEvent);

    request.raw.on('close', () => {
      clearInterval(heartbeat);
      sseEmitter.off('site_update', onSiteEvent);
    });
  });
};
