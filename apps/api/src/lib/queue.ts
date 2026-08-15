export interface EventQueue {
  push(events: any[]): void;
  process(handler: (events: any[]) => Promise<void>): void;
  size(): number;
}

export class InMemoryEventQueue implements EventQueue {
  private queue: any[] = [];
  private handler: ((events: any[]) => Promise<void>) | null = null;
  private batchSize: number;
  private flushIntervalMs: number;
  private timer: NodeJS.Timeout | null = null;
  private isProcessing = false;

  constructor(batchSize = 100, flushIntervalMs = 1000) {
    this.batchSize = batchSize;
    this.flushIntervalMs = flushIntervalMs;
  }

  push(events: any[]): void {
    this.queue.push(...events);
    if (this.queue.length >= this.batchSize) {
      this.flush();
    }
  }

  process(handler: (events: any[]) => Promise<void>): void {
    this.handler = handler;
    this.timer = setInterval(() => this.flush(), this.flushIntervalMs);
  }

  size(): number {
    return this.queue.length;
  }

  private async flush() {
    if (this.isProcessing || this.queue.length === 0 || !this.handler) return;

    this.isProcessing = true;
    const batch = this.queue.splice(0, this.batchSize);

    try {
      await this.handler(batch);
    } catch (error) {
      console.error('Error processing event batch:', error);
      // Depending on requirements, we might push them back to the queue
      // this.queue.unshift(...batch);
    } finally {
      this.isProcessing = false;
    }
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }
}

export const eventQueue = new InMemoryEventQueue();
