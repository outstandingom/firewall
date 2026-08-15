// ============================================================
// Adaptive Web Observability — Node.js SDK
// OpenTelemetry-compatible tracing, HTTP monitoring, error tracking
// ============================================================

import { resolveConfig, type NodeSDKConfig, type InternalConfig } from './config.js';
import { Transport } from './transport.js';
import { ErrorTracker } from './errors.js';
import { createExpressMiddleware } from './middleware/express.js';
import { createFastifyPlugin } from './middleware/fastify.js';
import { HttpInstrumentation } from './middleware/http.js';
import { TraceContext, type SpanContext } from './trace.js';

export interface AWONodeClient {
  config: InternalConfig;
  transport: Transport;
  errorTracker: ErrorTracker;
  expressMiddleware: ReturnType<typeof createExpressMiddleware>;
  fastifyPlugin: ReturnType<typeof createFastifyPlugin>;
  captureError: (err: Error, customType?: string) => void;
  trackCustomEvent: (eventName: string, data?: Record<string, unknown>) => void;
  getTraceContext: (parentHeader?: string | null) => SpanContext;
  flush: () => Promise<void>;
  shutdown: () => Promise<void>;
}

let globalClient: AWONodeClient | null = null;

/**
 * Initializes the Adaptive Web Observability Node.js SDK.
 *
 * Example:
 * ```typescript
 * import { monitor } from "@awo/node-sdk";
 *
 * const awo = monitor({
 *   apiKey: process.env.AWO_API_KEY!,
 *   serviceName: "billing-service",
 *   environment: "production"
 * });
 *
 * app.use(awo.expressMiddleware);
 * ```
 */
export function monitor(config: NodeSDKConfig): AWONodeClient {
  const resolvedConfig = resolveConfig(config);
  const transport = new Transport(resolvedConfig);
  const errorTracker = new ErrorTracker(transport, resolvedConfig);
  errorTracker.install();

  const httpInstrumentation = new HttpInstrumentation(transport, resolvedConfig);
  httpInstrumentation.install();

  const client: AWONodeClient = {
    config: resolvedConfig,
    transport,
    errorTracker,
    expressMiddleware: createExpressMiddleware(transport, resolvedConfig),
    fastifyPlugin: createFastifyPlugin(transport, resolvedConfig),
    captureError: (err: Error, customType?: string) => {
      errorTracker.captureError(err, false, customType);
    },
    trackCustomEvent: (eventName: string, data: Record<string, unknown> = {}) => {
      transport.enqueue({
        event_type: 'custom_event',
        timestamp: new Date().toISOString(),
        metadata: {
          event_name: eventName,
          ...data,
        },
      });
    },
    getTraceContext: (parentHeader?: string | null) => {
      return TraceContext.createSpanContext(parentHeader);
    },
    flush: async () => {
      await transport.flush();
    },
    shutdown: async () => {
      httpInstrumentation.restore();
      await transport.destroy();
    },
  };

  globalClient = client;
  return client;
}

export function getClient(): AWONodeClient | null {
  return globalClient;
}

export { TraceContext } from './trace.js';
export type { NodeSDKConfig, SpanContext };
export default monitor;
