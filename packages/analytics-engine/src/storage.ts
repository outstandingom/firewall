// ============================================================
// Analytics Engine — Storage Abstraction
// Interface that can be backed by PostgreSQL, ClickHouse, etc.
// ============================================================

export interface StoredEvent {
  id: string;
  siteId: string;
  sessionId?: string;
  visitorId?: string;
  eventType: string;
  timestamp: string;
  route?: string;
  metadata: Record<string, unknown>;
}

export interface QueryOptions {
  siteId: string;
  eventType?: string;
  from?: string;       // ISO timestamp
  to?: string;         // ISO timestamp
  route?: string;
  limit?: number;
  offset?: number;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
  dimensions?: Record<string, string>;
}

export interface AggregationResult {
  bucket: string;       // time bucket (ISO)
  metricName: string;
  count: number;
  sumValue: number;
  avgValue: number;
  minValue: number;
  maxValue: number;
  p50Value?: number;
  p95Value?: number;
  p99Value?: number;
  uniqueVisitors?: number;
  uniqueSessions?: number;
}

/**
 * Abstract event storage interface.
 * Implement this for PostgreSQL (MVP) or ClickHouse (scale).
 */
export interface EventStore {
  /** Insert a batch of events */
  insertEvents(events: StoredEvent[]): Promise<number>;

  /** Query events with filters */
  queryEvents(options: QueryOptions): Promise<StoredEvent[]>;

  /** Count events matching criteria */
  countEvents(options: QueryOptions): Promise<number>;

  /** Get aggregated metrics */
  getAggregations(
    siteId: string,
    metricName: string,
    from: string,
    to: string,
    bucketSize: 'hour' | 'day',
  ): Promise<AggregationResult[]>;

  /** Get unique counts (visitors, sessions) */
  getUniqueCounts(
    siteId: string,
    field: 'visitorId' | 'sessionId',
    from: string,
    to: string,
  ): Promise<number>;

  /** Delete old events (retention) */
  deleteOlderThan(siteId: string, beforeDate: string): Promise<number>;

  /** Health check */
  isHealthy(): Promise<boolean>;
}

/**
 * Queue abstraction for event processing pipeline.
 */
export interface QueueAdapter {
  /** Push events into the queue */
  push(events: StoredEvent[]): Promise<void>;

  /** Register a handler for processing events */
  onProcess(handler: (events: StoredEvent[]) => Promise<void>): void;

  /** Get current queue size */
  size(): number;

  /** Flush the queue (process all pending) */
  flush(): Promise<void>;

  /** Shutdown gracefully */
  shutdown(): Promise<void>;
}
