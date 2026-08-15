// ============================================================
// Fastify Plugin for Adaptive Web Observability
// ============================================================

import type { Transport } from '../transport.js';
import type { InternalConfig } from '../config.js';
import { TraceContext } from '../trace.js';

export function createFastifyPlugin(transport: Transport, config: InternalConfig) {
  return async function awoFastifyPlugin(fastify: any, _options: any) {
    fastify.addHook('onRequest', async (req: any, reply: any) => {
      req.awoStartTime = Date.now();
      const incomingTraceParent = req.headers?.['traceparent'] || req.headers?.['x-trace-id'];
      req.awoSpanContext = TraceContext.createSpanContext(incomingTraceParent);

      reply.header('traceparent', TraceContext.formatTraceParent(req.awoSpanContext));
      reply.header('x-trace-id', req.awoSpanContext.traceId);
    });

    fastify.addHook('onResponse', async (req: any, reply: any) => {
      const startTime = req.awoStartTime || Date.now();
      const durationMs = Date.now() - startTime;
      const url = req.url || '';

      const shouldIgnore = config.ignorePaths.some(pattern => {
        if (typeof pattern === 'string') return url.startsWith(pattern);
        return pattern.test(url);
      });

      if (shouldIgnore) return;

      const statusCode = reply.statusCode || 200;
      const normalizedPath = (req.routeOptions?.url || url.split('?')[0])
        .replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '/:id')
        .replace(/\/\d+/g, '/:id');

      transport.enqueue({
        event_type: 'network_request',
        timestamp: new Date(startTime).toISOString(),
        route: normalizedPath,
        metadata: {
          method: req.method || 'GET',
          url: url.split('?')[0],
          normalized_path: normalizedPath,
          status_code: statusCode,
          duration_ms: durationMs,
          is_success: statusCode < 400,
          trace_id: req.awoSpanContext?.traceId,
          span_id: req.awoSpanContext?.spanId,
          parent_span_id: req.awoSpanContext?.parentSpanId,
          initiator_type: 'fastify',
        },
      });
    });

    fastify.addHook('onError', async (req: any, _reply: any, error: Error) => {
      transport.enqueue({
        event_type: 'javascript_error',
        timestamp: new Date().toISOString(),
        metadata: {
          error_type: error.name || 'FastifyError',
          message: (error.message || '').slice(0, 2000),
          stack_trace: (error.stack || '').slice(0, 8192),
          is_unhandled: false,
          trace_id: req.awoSpanContext?.traceId,
          url: req.url,
          method: req.method,
          environment: config.environment,
          service_name: config.serviceName,
        },
      });
    });
  };
}
