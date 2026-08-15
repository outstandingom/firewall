import { FastifyPluginAsync } from 'fastify';
import supabase from '../lib/supabase.js';
import { eventQueue } from '../lib/queue.js';

export const healthRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/health', async (request, reply) => {
    return reply.send({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: '1.0.0'
    });
  });

  fastify.get('/health/detailed', async (request, reply) => {
    const start = performance.now();
    let dbConnected = false;
    let dbLatency = 0;

    try {
      await supabase.from('users').select('id').limit(1);
      dbConnected = true;
      dbLatency = performance.now() - start;
    } catch (e) {
      dbConnected = false;
    }

    const memUsage = process.memoryUsage();

    return reply.send({
      status: dbConnected ? 'ok' : 'degraded',
      database: { connected: dbConnected, latency: dbLatency },
      queue: { size: eventQueue.size(), processing: true },
      memory: {
        used: memUsage.heapUsed,
        total: memUsage.heapTotal
      }
    });
  });
};
