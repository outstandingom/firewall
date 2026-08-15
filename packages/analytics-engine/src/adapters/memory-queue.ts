// ============================================================
// In-Memory Queue Adapter
// MVP queue implementation. Can be swapped for Bull/Kafka later.
// ============================================================

import type { QueueAdapter, StoredEvent } from '../storage.js';

export class MemoryQueue implements QueueAdapter {
  private queue: StoredEvent[] = [];
  private handler: ((events: StoredEvent[]) => Promise<void>) | null = null;
  private batchSize: number;
  private flushIntervalMs: number;
  private timer: ReturnType<typeof setInterval> | null = null;
  private processing = false;

  constructor(batchSize = 50, flushIntervalMs = 5000) {
    this.batchSize = batchSize;
    this.flushIntervalMs = flushIntervalMs;
  }

  async push(events: StoredEvent[]): Promise<void> {
    this.queue.push(...events);

    // Auto-process if batch size reached
    if (this.queue.length >= this.batchSize) {
      await this.processQueue();
    }
  }

  onProcess(handler: (events: StoredEvent[]) => Promise<void>): void {
    this.handler = handler;

    // Start periodic flushing
    if (this.timer) clearInterval(this.timer);
    this.timer = setInterval(() => {
      this.processQueue().catch(err => {
        console.error('[MemoryQueue] Processing error:', err);
      });
    }, this.flushIntervalMs);
  }

  size(): number {
    return this.queue.length;
  }

  async flush(): Promise<void> {
    await this.processQueue();
  }

  async shutdown(): Promise<void> {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    // Process remaining events
    await this.processQueue();
  }

  private async processQueue(): Promise<void> {
    if (this.processing || this.queue.length === 0 || !this.handler) return;

    this.processing = true;
    try {
      // Take a batch from the queue
      const batch = this.queue.splice(0, this.batchSize);
      if (batch.length > 0) {
        await this.handler(batch);
      }
    } catch (err) {
      console.error('[MemoryQueue] Handler error:', err);
    } finally {
      this.processing = false;

      // If there are more events, process again
      if (this.queue.length >= this.batchSize) {
        setImmediate(() => this.processQueue());
      }
    }
  }
}
