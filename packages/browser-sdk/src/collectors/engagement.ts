import { EventQueue } from '../core/queue';
import { SessionManager } from '../core/session';
import { now, throttle } from '../utils/helpers';

export class EngagementCollector {
  private queue: EventQueue;
  private sessionManager: SessionManager;
  private maxScrollDepth: number = 0;
  private activeTimeStart: number = Date.now();
  private totalActiveTime: number = 0;

  constructor(queue: EventQueue, sessionManager: SessionManager) {
    this.queue = queue;
    this.sessionManager = sessionManager;
  }

  public init() {
    const scrollHandler = throttle(() => {
      try {
        const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
        const scrolled = document.documentElement.scrollTop;
        if (height > 0) {
          const depth = Math.round((scrolled / height) * 100);
          if (depth > this.maxScrollDepth) {
            this.maxScrollDepth = Math.min(depth, 100);
          }
        }
        this.sessionManager.touchSession();
      } catch (e) { /* ignore */ }
    }, 1000);

    window.addEventListener('scroll', scrollHandler as any, { passive: true });

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        this.totalActiveTime += (Date.now() - this.activeTimeStart);
        this.emitEngagement(); // Best effort emit
      } else {
        this.activeTimeStart = Date.now();
        this.sessionManager.touchSession();
      }
    });

    // Also on unload and SPA nav
    window.addEventListener('beforeunload', () => {
      this.totalActiveTime += (Date.now() - this.activeTimeStart);
      this.emitEngagement();
    });
    window.addEventListener('popstate', () => this.resetEngagement());
    window.addEventListener('pushstate', () => this.resetEngagement());
    window.addEventListener('replacestate', () => this.resetEngagement());
  }

  private resetEngagement() {
    this.totalActiveTime += (Date.now() - this.activeTimeStart);
    this.emitEngagement();
    
    this.maxScrollDepth = 0;
    this.totalActiveTime = 0;
    this.activeTimeStart = Date.now();
  }

  private emitEngagement() {
    try {
      this.queue.push({
        type: 'engagement',
        timestamp: now(),
        url: window.location.href,
        route: window.location.pathname,
        data: {
          max_scroll_depth: this.maxScrollDepth,
          active_time_ms: this.totalActiveTime,
          total_time_ms: this.totalActiveTime // approx for now
        }
      });
    } catch (e) { /* ignore */ }
  }
}
