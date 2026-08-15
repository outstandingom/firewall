// ============================================================
// Express Middleware for Adaptive Web Observability
// ============================================================

import type { Transport } from '../transport.js';
import type { InternalConfig } from '../config.js';
import { TraceContext } from '../trace.js';

export function createExpressMiddleware(transport: Transport, config: InternalConfig) {
  return function awoExpressMiddleware(req: any, res: any, next: any) {
    const startTime = Date.now();
    const incomingTraceParent = req.headers?.['traceparent'] || req.headers?.['x-trace-id'];
    const spanContext = TraceContext.createSpanContext(incomingTraceParent);

    // Propagate downstream
    res.setHeader('traceparent', TraceContext.formatTraceParent(spanContext));
    res.setHeader('x-trace-id', spanContext.traceId);

    // Check ignore paths
    const originalUrl = req.originalUrl || req.url || '';
    const shouldIgnore = config.ignorePaths.some(pattern => {
      if (typeof pattern === 'string') return originalUrl.startsWith(pattern);
      return pattern.test(originalUrl);
    });

    if (shouldIgnore) {
      return next();
    }

    res.on('finish', () => {
      const durationMs = Date.now() - startTime;
      const statusCode = res.statusCode || 200;
      const isSuccess = statusCode < 400;

      const normalizedPath = (req.route?.path || req.baseUrl || originalUrl.split('?')[0])
        .replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '/:id')
        .replace(/\/\d+/g, '/:id');

      transport.enqueue({
        event_type: 'network_request',
        timestamp: new Date(startTime).toISOString(),
        route: normalizedPath,
        metadata: {
          method: req.method || 'GET',
          url: originalUrl.split('?')[0],
          normalized_path: normalizedPath,
          status_code: statusCode,
          duration_ms: durationMs,
          is_success: isSuccess,
          trace_id: spanContext.traceId,
          span_id: spanContext.spanId,
          parent_span_id: spanContext.parentSpanId,
          initiator_type: 'express',
          response_size: parseInt(res.getHeader('content-length') || '0', 10) || undefined,
        },
      });
    });

    next();
  };
}
