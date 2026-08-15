// ============================================================
// Node.js SDK Configuration
// ============================================================

export interface NodeSDKConfig {
  apiKey: string;
  endpoint?: string;
  serviceName?: string;
  environment?: string;
  batchSize?: number;
  flushIntervalMs?: number;
  maxQueueSize?: number;
  captureErrors?: boolean;
  captureUnhandledRejections?: boolean;
  sampleRate?: number;
  ignorePaths?: (string | RegExp)[];
  maskHeaders?: string[];
  debug?: boolean;
}

export interface InternalConfig extends Required<Omit<NodeSDKConfig, 'ignorePaths' | 'maskHeaders'>> {
  ignorePaths: (string | RegExp)[];
  maskHeaders: string[];
}

export function resolveConfig(options: NodeSDKConfig): InternalConfig {
  if (!options.apiKey) {
    throw new Error('[AWO-Node-SDK] apiKey is required in monitor({...})');
  }

  return {
    apiKey: options.apiKey,
    endpoint: options.endpoint || process.env.AWO_ENDPOINT || 'http://localhost:3001',
    serviceName: options.serviceName || process.env.SERVICE_NAME || 'node-service',
    environment: options.environment || process.env.NODE_ENV || 'production',
    batchSize: options.batchSize ?? 20,
    flushIntervalMs: options.flushIntervalMs ?? 3000,
    maxQueueSize: options.maxQueueSize ?? 1000,
    captureErrors: options.captureErrors ?? true,
    captureUnhandledRejections: options.captureUnhandledRejections ?? true,
    sampleRate: options.sampleRate ?? 1.0,
    ignorePaths: options.ignorePaths || ['/health', '/metrics', '/favicon.ico'],
    maskHeaders: options.maskHeaders || ['authorization', 'cookie', 'set-cookie', 'x-api-key', 'proxy-authorization'],
    debug: options.debug ?? false,
  };
}
