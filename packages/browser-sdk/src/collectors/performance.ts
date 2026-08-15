import { EventQueue } from '../core/queue';
import { AWOConfig } from '../core/config';
import { now } from '../utils/helpers';

export class PerformanceCollector {
  private queue: EventQueue;
  private config: AWOConfig;

  constructor(queue: EventQueue, config: AWOConfig) {
    this.queue = queue;
    this.config = config;
  }

  public init() {
    if (!this.config.enablePerformanceTracking) return;

    // Wait for load to gather nav timing
    window.addEventListener('load', () => {
      setTimeout(() => this.collectNavigationTiming(), 0);
    });

    this.collectWebVitals();
  }

  private collectNavigationTiming() {
    try {
      const [navEntry] = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
      if (!navEntry) return;

      this.queue.push({
        type: 'performance_timing',
        timestamp: now(),
        url: window.location.href,
        route: window.location.pathname,
        data: {
          dns_ms: Math.max(0, navEntry.domainLookupEnd - navEntry.domainLookupStart),
          connection_ms: Math.max(0, navEntry.connectEnd - navEntry.connectStart),
          tls_ms: Math.max(0, navEntry.requestStart - navEntry.secureConnectionStart),
          ttfb_ms: Math.max(0, navEntry.responseStart - navEntry.requestStart),
          dom_load_ms: Math.max(0, navEntry.domContentLoadedEventEnd - navEntry.responseEnd),
          page_load_ms: Math.max(0, navEntry.loadEventEnd - navEntry.startTime)
        }
      });
    } catch (e) { /* ignore */ }
  }

  private collectWebVitals() {
    if (!('PerformanceObserver' in window)) return;

    const emitVital = (name: string, value: number, rating: string) => {
      this.queue.push({
        type: 'web_vital',
        timestamp: now(),
        url: window.location.href,
        route: window.location.pathname,
        data: { metric_name: name, value, rating }
      });
    };

    const getRating = (val: number, good: number, poor: number) => val < good ? 'good' : val > poor ? 'poor' : 'needs-improvement';

    try {
      // LCP
      new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries();
        const lastEntry = entries[entries.length - 1];
        const val = lastEntry.startTime;
        emitVital('LCP', val, getRating(val, 2500, 4000));
      }).observe({ type: 'largest-contentful-paint', buffered: true });
    } catch (e) {}

    try {
      // FID/INP - fallback to first-input for simplicity or event for INP
      new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries();
        let max = 0;
        entries.forEach((e: any) => {
          if (e.processingStart - e.startTime > max) max = e.processingStart - e.startTime;
        });
        if (max > 0) emitVital('INP', max, getRating(max, 200, 500));
      }).observe({ type: 'event', buffered: true });
    } catch (e) {}

    try {
      // CLS
      let clsVal = 0;
      new PerformanceObserver((entryList) => {
        for (const entry of entryList.getEntries() as any[]) {
          if (!entry.hadRecentInput) {
            clsVal += entry.value;
            emitVital('CLS', clsVal, getRating(clsVal, 0.1, 0.25));
          }
        }
      }).observe({ type: 'layout-shift', buffered: true });
    } catch (e) {}

    try {
      // FCP
      new PerformanceObserver((entryList) => {
        for (const entry of entryList.getEntries()) {
          if (entry.name === 'first-contentful-paint') {
            const val = entry.startTime;
            emitVital('FCP', val, getRating(val, 1800, 3000));
          }
        }
      }).observe({ type: 'paint', buffered: true });
    } catch (e) {}
  }
}
