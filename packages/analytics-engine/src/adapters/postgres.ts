// ============================================================
// PostgreSQL Event Store Adapter (via Supabase)
// MVP implementation of the EventStore interface.
// ============================================================

import type { EventStore, StoredEvent, QueryOptions, AggregationResult } from '../storage.js';

// This adapter works with any Supabase client instance passed in
export class PostgresEventStore implements EventStore {
  private supabase: any;

  constructor(supabaseClient: any) {
    this.supabase = supabaseClient;
  }

  async insertEvents(events: StoredEvent[]): Promise<number> {
    if (events.length === 0) return 0;

    const rows = events.map(e => ({
      id: e.id,
      site_id: e.siteId,
      session_id: e.sessionId || null,
      visitor_id: e.visitorId || null,
      event_type: e.eventType,
      timestamp: e.timestamp,
      route: e.route || null,
      metadata: e.metadata,
    }));

    const { error } = await this.supabase
      .from('events')
      .insert(rows);

    if (error) {
      console.error('[PostgresEventStore] Insert error:', error.message);
      return 0;
    }

    return events.length;
  }

  async queryEvents(options: QueryOptions): Promise<StoredEvent[]> {
    let query = this.supabase
      .from('events')
      .select('*')
      .eq('site_id', options.siteId)
      .order('timestamp', { ascending: options.orderDirection === 'asc' });

    if (options.eventType) {
      query = query.eq('event_type', options.eventType);
    }
    if (options.from) {
      query = query.gte('timestamp', options.from);
    }
    if (options.to) {
      query = query.lte('timestamp', options.to);
    }
    if (options.route) {
      query = query.eq('route', options.route);
    }
    if (options.limit) {
      query = query.limit(options.limit);
    }
    if (options.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 50) - 1);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[PostgresEventStore] Query error:', error.message);
      return [];
    }

    return (data || []).map(this.mapRowToEvent);
  }

  async countEvents(options: QueryOptions): Promise<number> {
    let query = this.supabase
      .from('events')
      .select('id', { count: 'exact', head: true })
      .eq('site_id', options.siteId);

    if (options.eventType) {
      query = query.eq('event_type', options.eventType);
    }
    if (options.from) {
      query = query.gte('timestamp', options.from);
    }
    if (options.to) {
      query = query.lte('timestamp', options.to);
    }

    const { count, error } = await query;

    if (error) {
      console.error('[PostgresEventStore] Count error:', error.message);
      return 0;
    }

    return count || 0;
  }

  async getAggregations(
    siteId: string,
    metricName: string,
    from: string,
    to: string,
    bucketSize: 'hour' | 'day',
  ): Promise<AggregationResult[]> {
    // Query pre-aggregated tables
    const table = bucketSize === 'hour' ? 'hourly_metrics' : 'daily_metrics';
    const timeCol = bucketSize === 'hour' ? 'hour' : 'day';

    const { data, error } = await this.supabase
      .from(table)
      .select('*')
      .eq('site_id', siteId)
      .eq('metric_name', metricName)
      .gte(timeCol, from)
      .lte(timeCol, to)
      .order(timeCol, { ascending: true });

    if (error) {
      console.error('[PostgresEventStore] Aggregation error:', error.message);
      return [];
    }

    return (data || []).map((row: any) => ({
      bucket: row[timeCol],
      metricName: row.metric_name,
      count: row.count || 0,
      sumValue: row.sum_value || 0,
      avgValue: row.avg_value || 0,
      minValue: row.min_value || 0,
      maxValue: row.max_value || 0,
      p50Value: row.p50_value,
      p95Value: row.p95_value,
      p99Value: row.p99_value,
      uniqueVisitors: row.unique_visitors || 0,
      uniqueSessions: row.unique_sessions || 0,
    }));
  }

  async getUniqueCounts(
    siteId: string,
    field: 'visitorId' | 'sessionId',
    from: string,
    to: string,
  ): Promise<number> {
    const dbField = field === 'visitorId' ? 'visitor_id' : 'session_id';

    const { data, error } = await this.supabase
      .from('events')
      .select(dbField)
      .eq('site_id', siteId)
      .gte('timestamp', from)
      .lte('timestamp', to)
      .not(dbField, 'is', null);

    if (error) {
      console.error('[PostgresEventStore] Unique count error:', error.message);
      return 0;
    }

    const uniqueValues = new Set((data || []).map((row: any) => row[dbField]));
    return uniqueValues.size;
  }

  async deleteOlderThan(siteId: string, beforeDate: string): Promise<number> {
    const { data, error } = await this.supabase
      .from('events')
      .delete()
      .eq('site_id', siteId)
      .lt('timestamp', beforeDate)
      .select('id');

    if (error) {
      console.error('[PostgresEventStore] Retention delete error:', error.message);
      return 0;
    }

    return data?.length || 0;
  }

  async isHealthy(): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('events')
        .select('id')
        .limit(1);
      return !error;
    } catch {
      return false;
    }
  }

  private mapRowToEvent(row: any): StoredEvent {
    return {
      id: row.id,
      siteId: row.site_id,
      sessionId: row.session_id,
      visitorId: row.visitor_id,
      eventType: row.event_type,
      timestamp: row.timestamp,
      route: row.route,
      metadata: row.metadata || {},
    };
  }
}
