// ============================================================
// Node.js SDK Transport Layer
// Buffered, non-blocking asynchronous event batching with retry
// ============================================================

import type { InternalConfig } from './config.js';

export interface TelemetryEvent {
  event_type: string;
  timestamp: string;
  route?: string;
  metadata: Record<string, unknown>;
}

export class Transport {
  private queue: TelemetryEvent[] = [];
  private timer: NodeJS.Timeout | null = null;
  private isFlushing = false;
  private isDestroyed = false;

  constructor(private config: InternalConfig) {
    this.startTimer();
  }

  enqueue(event: TelemetryEvent): void {
    if (this.isDestroyed) return;

    // Sampling check
    if (this.config.sampleRate < 1.0 && Math.random() > this.config.sampleRate) {
      return;
    }

    if (this.queue.length >= this.config.maxQueueSize) {
      // Drop oldest to avoid memory leak
      this.queue.shift();
    }

    this.queue.push(event);

    if (this.queue.length >= this.config.batchSize) {
      this.flush().catch(() => {});
    }
  }

  async flush(): Promise<void> {
    if (this.isFlushing || this.queue.length === 0) return;

    this.isFlushing = true;
    const batch = this.queue.splice(0, this.config.batchSize);

    try {
      await this.sendWithRetry(batch);
    } catch (err) {
      if (this.config.debug) {
        console.error('[AWO-Node-SDK] Failed to deliver batch after retries:', err);
      }
    } finally {
      this.isFlushing = false;
      if (this.queue.length >= this.config.batchSize) {
        setImmediate(() => this.flush().catch(() => {}));
      }
    }
  }

  private async sendWithRetry(events: TelemetryEvent[], maxRetries = 2): Promise<void> {
    const url = `${this.config.endpoint.replace(/\/$/, '')}/v1/events/batch`;
    const payload = JSON.stringify({
      site_key: this.config.apiKey,
      events: events.map(e => ({
        ...e,
        metadata: {
          ...e.metadata,
          service_name: this.config.serviceName,
          environment: this.config.environment,
          runtime: 'nodejs',
          runtime_version: process.version,
        },
      })),
    });

    let attempt = 0;
    while (attempt <= maxRetries) {
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Site-Key': this.config.apiKey,
          },
          body: payload,
          signal: AbortSignal.timeout(5000),
        });

        if (response.ok) {
          return;
        }

        if (response.status === 401 || response.status === 403) {
          if (this.config.debug) {
            console.error('[AWO-Node-SDK] Authentication failure with site key:', response.status);
          }
          return; // Do not retry auth failures
        }
      } catch (err) {
        if (attempt === maxRetries) throw err;
      }

      attempt++;
      const backoffMs = Math.min(1000 * Math.pow(2, attempt), 4000);
      await new Promise(res => setTimeout(res, backoffMs));
    }
  }

  private startTimer(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = setInterval(() => {
      this.flush().catch(() => {});
    }, this.config.flushIntervalMs);
    // Unref timer so node process can exit cleanly
    this.timer.unref();
  }

  async destroy(): Promise<void> {
    this.isDestroyed = true;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    await this.flush();
  }
}
