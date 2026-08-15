import { SDKEvent, AWOConfig } from './config';
import { sendBatch } from './transport';

export class EventQueue {
  private queue: SDKEvent[] = [];
  private timer: number | null = null;
  private config: AWOConfig;

  constructor(config: AWOConfig) {
    this.config = config;
    this.startTimer();
    this.setupListeners();
  }

  public push(event: SDKEvent) {
    this.queue.push(event);
    if (this.queue.length > this.config.maxQueueSize) {
      this.queue.shift(); // Drop oldest
    }
    if (this.queue.length >= this.config.batchSize) {
      this.flush();
    }
  }

  public async flush() {
    if (this.queue.length === 0) return;
    
    const eventsToSend = [...this.queue];
    this.queue = []; // Clear queue optimistic

    try {
      await sendBatch(this.config.endpoint, this.config.siteKey, eventsToSend, this.config.maxRetries);
    } catch (e) {
      // If error (after retries), drop silently to avoid infinite build up
      if (this.config.debug) console.error('AWO: Failed to flush events', e);
    }
  }

  private startTimer() {
    if (this.timer !== null) {
      window.clearInterval(this.timer);
    }
    this.timer = window.setInterval(() => {
      this.flush();
    }, this.config.flushInterval);
  }

  private setupListeners() {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        this.flush();
      }
    };
    window.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', () => this.flush());
  }

  public destroy() {
    if (this.timer !== null) {
      window.clearInterval(this.timer);
      this.timer = null;
    }
    this.flush(); // Final flush
  }
}
