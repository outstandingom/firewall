import { AWOConfig, mergeConfig } from './core/config';
import { EventQueue } from './core/queue';
import { SessionManager } from './core/session';
import { getVisitorId } from './core/identity';
import { isOptedOut, optIn, optOut } from './privacy/consent';
import { getDeviceInfo } from './utils/device';

// Collectors
import { PageViewCollector } from './collectors/page-view';
import { ErrorCollector } from './collectors/errors';
import { NetworkCollector } from './collectors/network';
import { PerformanceCollector } from './collectors/performance';
import { InteractionCollector } from './collectors/interactions';
import { EngagementCollector } from './collectors/engagement';

class AWOTracker {
  private config!: AWOConfig;
  private queue!: EventQueue;
  private sessionManager!: SessionManager;
  private initialized = false;

  public init(userConfig: Partial<AWOConfig>) {
    if (this.initialized) return;
    
    try {
      this.config = mergeConfig(userConfig);
      
      if (this.config.respectDoNotTrack && isOptedOut()) {
        if (this.config.debug) console.log('AWO: Opted out of tracking');
        return;
      }

      this.queue = new EventQueue(this.config);
      this.sessionManager = new SessionManager(this.config.sessionTimeout, this.queue);

      const visitorId = getVisitorId();
      const sessionId = this.sessionManager.getSession().id;
      const deviceInfo = getDeviceInfo();

      // Override push to always inject context
      const originalPush = this.queue.push.bind(this.queue);
      this.queue.push = (event) => {
        event.visitor_id = visitorId;
        event.session_id = this.sessionManager.getSession().id; // Get fresh session ID
        if (!event.data) event.data = {};
        event.data = { ...event.data, ...deviceInfo, sdk_version: this.config.version || '1.0.0' };
        originalPush(event);
      };

      // Initialize collectors
      new PageViewCollector(this.queue, this.config).init();
      new ErrorCollector(this.queue, this.config).init();
      new NetworkCollector(this.queue, this.config).init();
      new PerformanceCollector(this.queue, this.config).init();
      new InteractionCollector(this.queue, this.config).init();
      new EngagementCollector(this.queue, this.sessionManager).init();

      this.initialized = true;
      if (this.config.debug) console.log('AWO: Initialized', this.config);
    } catch (e) {
      console.error('AWO: Failed to initialize', e);
    }
  }

  public trackEvent(name: string, data?: any) {
    if (!this.initialized || isOptedOut()) return;
    try {
      this.queue.push({
        type: 'custom_event',
        timestamp: new Date().toISOString(),
        url: window.location.href,
        route: window.location.pathname,
        data: { event_name: name, custom_data: data }
      });
      this.sessionManager.touchSession();
    } catch (e) { /* ignore */ }
  }

  public identify(traits: any) {
    if (!this.initialized || isOptedOut()) return;
    try {
      this.queue.push({
        type: 'identify',
        timestamp: new Date().toISOString(),
        url: window.location.href,
        route: window.location.pathname,
        data: { traits }
      });
    } catch (e) { /* ignore */ }
  }

  public optOut() {
    optOut();
    if (this.initialized) {
      this.queue.destroy();
      this.initialized = false;
    }
  }

  public optIn() {
    optIn();
  }
}

const AWO = new AWOTracker();

// Auto-init from script tag
(function() {
  try {
    const scripts = document.querySelectorAll('script[data-site-key]');
    const script = scripts[scripts.length - 1];
    if (script) {
      const siteKey = script.getAttribute('data-site-key');
      const endpoint = script.getAttribute('data-endpoint') || 'http://localhost:3001';
      if (siteKey) AWO.init({ siteKey, endpoint });
    }
  } catch(e) { /* silent */ }
})();

export default AWO;
