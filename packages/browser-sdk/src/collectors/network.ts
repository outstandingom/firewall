import { EventQueue } from '../core/queue';
import { AWOConfig } from '../core/config';
import { now } from '../utils/helpers';
import { sanitizeUrl } from '../privacy/sanitizer';

export class NetworkCollector {
  private queue: EventQueue;
  private config: AWOConfig;
  private originalFetch: typeof window.fetch | null = null;
  private originalXhrOpen: any = null;
  private originalXhrSend: any = null;

  constructor(queue: EventQueue, config: AWOConfig) {
    this.queue = queue;
    this.config = config;
  }

  public init() {
    if (!this.config.enableNetworkTracking) return;
    this.instrumentFetch();
    this.instrumentXHR();
  }

  public destroy() {
    if (this.originalFetch) window.fetch = this.originalFetch;
    if (this.originalXhrOpen) XMLHttpRequest.prototype.open = this.originalXhrOpen;
    if (this.originalXhrSend) XMLHttpRequest.prototype.send = this.originalXhrSend;
  }

  private normalizeUrl(url: string): string {
    try {
      const parsed = new URL(url, window.location.origin);
      let path = parsed.pathname;
      // Replace UUIDs and numeric IDs
      path = path.replace(/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/g, ':id');
      path = path.replace(/\/\d+(?=\/|$)/g, '/:id');
      parsed.pathname = path;
      return sanitizeUrl(parsed.toString());
    } catch (e) {
      return sanitizeUrl(url);
    }
  }

  private shouldTrack(url: string): boolean {
    if (url.includes(this.config.endpoint)) return false;
    for (const pattern of this.config.excludeUrlPatterns) {
      if (new RegExp(pattern).test(url)) return false;
    }
    return true;
  }

  private instrumentFetch() {
    this.originalFetch = window.fetch;
    const self = this;

    window.fetch = async function (...args) {
      const startTime = Date.now();
      let requestUrl = '';
      let method = 'GET';

      try {
        if (typeof args[0] === 'string') {
          requestUrl = args[0];
        } else if (args[0] instanceof Request) {
          requestUrl = args[0].url;
          method = args[0].method;
        }
        if (args[1] && args[1].method) {
          method = args[1].method;
        }
      } catch (e) { /* ignore */ }

      const shouldTrackRequest = self.shouldTrack(requestUrl);

      try {
        const response = await self.originalFetch!.apply(this, args);
        if (shouldTrackRequest) {
          self.trackResponse(method, requestUrl, response.status, Date.now() - startTime, response.headers.get('content-length'));
        }
        return response;
      } catch (error) {
        if (shouldTrackRequest) {
          self.trackResponse(method, requestUrl, 0, Date.now() - startTime, null, false);
        }
        throw error;
      }
    };
  }

  private instrumentXHR() {
    this.originalXhrOpen = XMLHttpRequest.prototype.open;
    this.originalXhrSend = XMLHttpRequest.prototype.send;
    const self = this;

    XMLHttpRequest.prototype.open = function (method: string, url: string | URL, ...rest: any[]) {
      (this as any)._awo_method = method;
      (this as any)._awo_url = typeof url === 'string' ? url : url.toString();
      (this as any)._awo_start = Date.now();
      return self.originalXhrOpen.apply(this, [method, url, ...rest]);
    };

    XMLHttpRequest.prototype.send = function (...args) {
      const xhr = this as any;
      if (self.shouldTrack(xhr._awo_url)) {
        this.addEventListener('loadend', () => {
          self.trackResponse(
            xhr._awo_method,
            xhr._awo_url,
            xhr.status,
            Date.now() - xhr._awo_start,
            xhr.getResponseHeader('content-length')
          );
        });
      }
      return self.originalXhrSend.apply(this, args);
    };
  }

  private trackResponse(method: string, url: string, status: number, duration: number, contentLength: string | null, success: boolean = true) {
    try {
      this.queue.push({
        type: 'network_request',
        timestamp: now(),
        url: window.location.href,
        route: window.location.pathname,
        data: {
          method: method.toUpperCase(),
          request_url: this.normalizeUrl(url),
          status,
          duration_ms: duration,
          response_size: contentLength ? parseInt(contentLength, 10) : 0,
          success: success && status >= 200 && status < 400
        }
      });
    } catch (e) { /* ignore */ }
  }
}
