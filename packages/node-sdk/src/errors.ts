// ============================================================
// Node.js SDK Error Monitoring
// Global exception and rejection monitoring
// ============================================================

import type { Transport } from './transport.js';
import type { InternalConfig } from './config.js';

export class ErrorTracker {
  private originalUncaughtHandler: ((err: Error) => void) | null = null;
  private originalUnhandledRejectionHandler: ((reason: any) => void) | null = null;

  constructor(private transport: Transport, private config: InternalConfig) {}

  install(): void {
    if (this.config.captureErrors) {
      process.on('uncaughtException', (err: Error) => {
        this.captureError(err, true);
      });
    }

    if (this.config.captureUnhandledRejections) {
      process.on('unhandledRejection', (reason: any) => {
        const err = reason instanceof Error ? reason : new Error(String(reason));
        this.captureError(err, true, 'UnhandledPromiseRejection');
      });
    }
  }

  captureError(err: Error, isUnhandled = false, customType?: string): void {
    try {
      const fingerprint = this.generateFingerprint(err);
      this.transport.enqueue({
        event_type: 'javascript_error',
        timestamp: new Date().toISOString(),
        metadata: {
          error_type: customType || err.name || 'Error',
          message: (err.message || '').slice(0, 2000),
          stack_trace: (err.stack || '').slice(0, 8192),
          is_unhandled: isUnhandled,
          fingerprint,
          environment: this.config.environment,
          service_name: this.config.serviceName,
        },
      });
    } catch {
      // Never crash on error tracking failure
    }
  }

  private generateFingerprint(err: Error): string {
    const input = `${err.name || 'Error'}:${(err.message || '').slice(0, 200)}`;
    let hash = 0x811c9dc5;
    for (let i = 0; i < input.length; i++) {
      hash ^= input.charCodeAt(i);
      hash = (hash * 0x01000193) >>> 0;
    }
    return hash.toString(16).padStart(8, '0');
  }
}
