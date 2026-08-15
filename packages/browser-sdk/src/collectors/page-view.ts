import { EventQueue } from '../core/queue';
import { AWOConfig } from '../core/config';
import { now } from '../utils/helpers';
import { sanitizeUrl } from '../privacy/sanitizer';

export class PageViewCollector {
  private queue: EventQueue;
  private config: AWOConfig;
  private lastRoute: string = '';
  private lastUrl: string = '';
  private lastTimestamp: number = 0;

  constructor(queue: EventQueue, config: AWOConfig) {
    this.queue = queue;
    this.config = config;
  }

  public init() {
    this.track(false);

    // Intercept SPA navigations
    const originalPushState = history.pushState;
    history.pushState = function (...args) {
      originalPushState.apply(this, args);
      window.dispatchEvent(new Event('pushstate'));
    };

    const originalReplaceState = history.replaceState;
    history.replaceState = function (...args) {
      originalReplaceState.apply(this, args);
      window.dispatchEvent(new Event('replacestate'));
    };

    window.addEventListener('popstate', () => this.track(true));
    window.addEventListener('pushstate', () => this.track(true));
    window.addEventListener('replacestate', () => this.track(true));
  }

  private track(isSpaNav: boolean) {
    try {
      const currentUrl = sanitizeUrl(window.location.href);
      const currentRoute = window.location.pathname;
      const title = document.title;
      const referrer = sanitizeUrl(document.referrer);

      // Skip excluded routes
      if (this.config.excludeRoutes.includes(currentRoute)) return;

      // Deduplicate rapid SPA navigations (< 100ms)
      const currentTimestamp = Date.now();
      if (isSpaNav && currentUrl === this.lastUrl && (currentTimestamp - this.lastTimestamp < 100)) {
        return;
      }

      this.lastUrl = currentUrl;
      this.lastRoute = currentRoute;
      this.lastTimestamp = currentTimestamp;

      this.queue.push({
        type: 'page_view',
        timestamp: now(),
        url: currentUrl,
        route: currentRoute,
        title: title,
        data: {
          referrer,
          is_spa_nav: isSpaNav
        }
      });
    } catch (e) { /* ignore */ }
  }
}
