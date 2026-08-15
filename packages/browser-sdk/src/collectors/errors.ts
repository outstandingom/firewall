import { EventQueue } from '../core/queue';
import { AWOConfig } from '../core/config';
import { now } from '../utils/helpers';

export class ErrorCollector {
  private queue: EventQueue;
  private config: AWOConfig;
  private recentErrors: Map<string, number> = new Map();

  constructor(queue: EventQueue, config: AWOConfig) {
    this.queue = queue;
    this.config = config;
  }

  public init() {
    if (!this.config.enableErrorTracking) return;

    window.addEventListener('error', (event: ErrorEvent) => {
      try {
        if (event.error) {
          this.captureError(event.error, 'runtime');
        } else {
          // Resource loading error
          const target = event.target as any;
          if (target && (target.tagName === 'IMG' || target.tagName === 'SCRIPT' || target.tagName === 'LINK')) {
            this.captureResourceError(target);
          }
        }
      } catch (e) { /* ignore */ }
    }, true);

    window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
      try {
        const error = event.reason instanceof Error ? event.reason : new Error(String(event.reason));
        this.captureError(error, 'unhandled_rejection');
      } catch (e) { /* ignore */ }
    });
  }

  private captureError(error: Error, type: string) {
    const message = error.message || 'Unknown Error';
    const errorType = error.name || 'Error';
    const stack = error.stack ? error.stack.substring(0, 8192) : '';
    const filename = this.extractFilename(stack);
    
    // Hash: error_type + message (200) + filename
    const fingerprint = `${errorType}:${message.substring(0, 200)}:${filename}`;
    
    const current = Date.now();
    const lastSeen = this.recentErrors.get(fingerprint);
    if (lastSeen && (current - lastSeen < 5000)) return; // deduplicate
    this.recentErrors.set(fingerprint, current);

    this.queue.push({
      type: 'js_error',
      timestamp: now(),
      url: window.location.href,
      route: window.location.pathname,
      data: {
        message,
        error_type: errorType,
        stack_trace: stack,
        filename,
        category: type
      }
    });
  }

  private captureResourceError(target: HTMLElement) {
    const tagName = target.tagName.toLowerCase();
    const src = (target as any).src || (target as any).href || '';
    
    this.queue.push({
      type: 'resource_error',
      timestamp: now(),
      url: window.location.href,
      route: window.location.pathname,
      data: {
        tag_name: tagName,
        resource_url: src
      }
    });
  }

  private extractFilename(stack: string): string {
    const match = stack.match(/at\s+(?:.*\s+)?\(?(.*:\d+:\d+)\)?/);
    return match ? match[1] : 'unknown';
  }
}
