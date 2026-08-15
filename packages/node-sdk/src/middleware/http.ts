// ============================================================
// Node.js Native HTTP Instrumentation
// Instruments http.request / https.request for outgoing calls
// ============================================================

import http from 'http';
import https from 'https';
import type { Transport } from '../transport.js';
import type { InternalConfig } from '../config.js';
import { TraceContext } from '../trace.js';

export class HttpInstrumentation {
  private originalHttpRequest = http.request;
  private originalHttpsRequest = https.request;

  constructor(private transport: Transport, private config: InternalConfig) {}

  install(): void {
    const self = this;

    // Wrap http.request
    (http as any).request = function wrappedHttpRequest(...args: any[]) {
      return self.wrapRequest(self.originalHttpRequest, args, 'http');
    };

    // Wrap https.request
    (https as any).request = function wrappedHttpsRequest(...args: any[]) {
      return self.wrapRequest(self.originalHttpsRequest, args, 'https');
    };
  }

  private wrapRequest(originalFn: Function, args: any[], protocol: string) {
    const startTime = Date.now();
    let urlStr = '';

    try {
      if (typeof args[0] === 'string') {
        urlStr = args[0];
      } else if (args[0] instanceof URL) {
        urlStr = args[0].toString();
      } else if (args[0] && typeof args[0] === 'object') {
        const host = args[0].host || args[0].hostname || 'localhost';
        const path = args[0].path || '/';
        urlStr = `${protocol}://${host}${path}`;
      }
    } catch {
      urlStr = 'unknown';
    }

    const req = originalFn.apply(http, args);

    // Inject traceparent if not present
    try {
      if (!req.getHeader('traceparent')) {
        const span = TraceContext.createSpanContext();
        req.setHeader('traceparent', TraceContext.formatTraceParent(span));
        req.setHeader('x-trace-id', span.traceId);
      }
    } catch {}

    // Avoid monitoring calls to our own ingestion endpoint
    if (urlStr.includes(this.config.endpoint)) {
      return req;
    }

    req.on('response', (res: any) => {
      const durationMs = Date.now() - startTime;
      const normalizedPath = urlStr.split('?')[0]
        .replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '/:id')
        .replace(/\/\d+/g, '/:id');

      self.transport.enqueue({
        event_type: 'network_request',
        timestamp: new Date(startTime).toISOString(),
        route: normalizedPath,
        metadata: {
          method: req.method || 'GET',
          url: urlStr.split('?')[0],
          normalized_path: normalizedPath,
          status_code: res.statusCode || 200,
          duration_ms: durationMs,
          is_success: (res.statusCode || 200) < 400,
          initiator_type: 'http_client',
        },
      });
    });

    return req;
  }

  restore(): void {
    http.request = this.originalHttpRequest;
    https.request = this.originalHttpsRequest;
  }
}
