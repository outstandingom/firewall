// ============================================================
// Aggregation Processor — Pre-computes hourly/daily metrics
// ============================================================

import type { SupabaseClient } from '@supabase/supabase-js';

export class AggregationProcessor {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Aggregate metrics for the current hour across all active sites.
   */
  async aggregateCurrentHour(): Promise<void> {
    const now = new Date();
    const hourStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours());
    const hourEnd = new Date(hourStart.getTime() + 3600000);

    // Get active sites (had events in last hour)
    const { data: sites } = await this.supabase
      .from('sites')
      .select('id')
      .gte('last_event_at', hourStart.toISOString());

    if (!sites || sites.length === 0) return;

    for (const site of sites) {
      await this.aggregateHourForSite(site.id, hourStart.toISOString(), hourEnd.toISOString());
    }
  }

  /**
   * Aggregate yesterday's metrics for daily rollup.
   */
  async aggregateYesterday(): Promise<void> {
    const now = new Date();
    const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const { data: sites } = await this.supabase
      .from('sites')
      .select('id');

    if (!sites) return;

    for (const site of sites) {
      await this.aggregateDayForSite(site.id, yesterday.toISOString().split('T')[0], yesterday.toISOString(), today.toISOString());
    }
  }

  private async aggregateHourForSite(siteId: string, from: string, to: string): Promise<void> {
    // Aggregate page views
    const { count: pvCount } = await this.supabase
      .from('page_views')
      .select('id', { count: 'exact', head: true })
      .eq('site_id', siteId)
      .gte('timestamp', from)
      .lt('timestamp', to);

    // Aggregate errors
    const { count: errorCount } = await this.supabase
      .from('errors')
      .select('id', { count: 'exact', head: true })
      .eq('site_id', siteId)
      .gte('timestamp', from)
      .lt('timestamp', to);

    // Aggregate network requests
    const { data: networkData } = await this.supabase
      .from('network_requests')
      .select('duration_ms, is_success, status_code')
      .eq('site_id', siteId)
      .gte('timestamp', from)
      .lt('timestamp', to);

    // Unique visitors and sessions
    const { data: visitorData } = await this.supabase
      .from('events')
      .select('visitor_id, session_id')
      .eq('site_id', siteId)
      .gte('timestamp', from)
      .lt('timestamp', to);

    const uniqueVisitors = new Set((visitorData || []).map(v => v.visitor_id).filter(Boolean)).size;
    const uniqueSessions = new Set((visitorData || []).map(v => v.session_id).filter(Boolean)).size;

    // Calculate network stats
    const durations = (networkData || []).map(n => n.duration_ms).filter(Boolean).sort((a, b) => a - b);
    const failedRequests = (networkData || []).filter(n => !n.is_success).length;
    const totalRequests = (networkData || []).length;

    const stats = this.calculateStats(durations);

    // Upsert hourly metrics
    const metrics = [
      {
        site_id: siteId, hour: from, metric_name: 'page_views',
        count: pvCount || 0, unique_visitors: uniqueVisitors, unique_sessions: uniqueSessions,
        sum_value: 0, avg_value: 0, min_value: 0, max_value: 0,
        p50_value: null, p95_value: null, p99_value: null,
      },
      {
        site_id: siteId, hour: from, metric_name: 'errors',
        count: errorCount || 0, sum_value: 0, avg_value: 0, min_value: 0, max_value: 0,
        unique_visitors: 0, unique_sessions: 0,
        p50_value: null, p95_value: null, p99_value: null,
      },
      {
        site_id: siteId, hour: from, metric_name: 'requests',
        count: totalRequests,
        sum_value: stats.sum, avg_value: stats.avg,
        min_value: stats.min, max_value: stats.max,
        p50_value: stats.p50, p95_value: stats.p95, p99_value: stats.p99,
        unique_visitors: 0, unique_sessions: 0,
      },
      {
        site_id: siteId, hour: from, metric_name: 'error_rate',
        count: 1,
        sum_value: totalRequests > 0 ? (failedRequests / totalRequests) * 100 : 0,
        avg_value: totalRequests > 0 ? (failedRequests / totalRequests) * 100 : 0,
        min_value: 0, max_value: 0,
        p50_value: null, p95_value: null, p99_value: null,
        unique_visitors: 0, unique_sessions: 0,
      },
    ];

    // Delete existing metrics for this hour (upsert pattern)
    for (const metric of metrics) {
      await this.supabase
        .from('hourly_metrics')
        .delete()
        .eq('site_id', siteId)
        .eq('hour', from)
        .eq('metric_name', metric.metric_name);
    }

    const { error } = await this.supabase.from('hourly_metrics').insert(metrics);
    if (error) console.error('[Aggregation] Hourly insert error:', error.message);

    // Update API endpoints
    await this.updateApiEndpoints(siteId, from, to);
  }

  private async aggregateDayForSite(siteId: string, day: string, from: string, to: string): Promise<void> {
    // Roll up hourly metrics into daily
    const { data: hourlyData } = await this.supabase
      .from('hourly_metrics')
      .select('*')
      .eq('site_id', siteId)
      .gte('hour', from)
      .lt('hour', to);

    if (!hourlyData || hourlyData.length === 0) return;

    // Group by metric_name
    const byMetric = new Map<string, any[]>();
    for (const row of hourlyData) {
      if (!byMetric.has(row.metric_name)) byMetric.set(row.metric_name, []);
      byMetric.get(row.metric_name)!.push(row);
    }

    const dailyMetrics = [];
    for (const [metricName, rows] of byMetric) {
      dailyMetrics.push({
        site_id: siteId,
        day,
        metric_name: metricName,
        count: rows.reduce((sum, r) => sum + (r.count || 0), 0),
        sum_value: rows.reduce((sum, r) => sum + (r.sum_value || 0), 0),
        avg_value: rows.reduce((sum, r) => sum + (r.avg_value || 0), 0) / rows.length,
        min_value: Math.min(...rows.map(r => r.min_value ?? Infinity)),
        max_value: Math.max(...rows.map(r => r.max_value ?? -Infinity)),
        p50_value: rows.find(r => r.p50_value)?.p50_value || null,
        p95_value: Math.max(...rows.map(r => r.p95_value ?? 0)) || null,
        p99_value: Math.max(...rows.map(r => r.p99_value ?? 0)) || null,
        unique_visitors: Math.max(...rows.map(r => r.unique_visitors || 0)),
        unique_sessions: rows.reduce((sum, r) => sum + (r.unique_sessions || 0), 0),
      });
    }

    // Delete existing daily metrics
    await this.supabase
      .from('daily_metrics')
      .delete()
      .eq('site_id', siteId)
      .eq('day', day);

    if (dailyMetrics.length > 0) {
      const { error } = await this.supabase.from('daily_metrics').insert(dailyMetrics);
      if (error) console.error('[Aggregation] Daily insert error:', error.message);
    }
  }

  private async updateApiEndpoints(siteId: string, from: string, to: string): Promise<void> {
    // Get network requests grouped by method + normalized path
    const { data: requests } = await this.supabase
      .from('network_requests')
      .select('method, normalized_path, duration_ms, status_code, is_success')
      .eq('site_id', siteId)
      .gte('timestamp', from)
      .lt('timestamp', to);

    if (!requests || requests.length === 0) return;

    const endpointMap = new Map<string, any[]>();
    for (const req of requests) {
      const key = `${req.method}:${req.normalized_path}`;
      if (!endpointMap.has(key)) endpointMap.set(key, []);
      endpointMap.get(key)!.push(req);
    }

    for (const [key, reqs] of endpointMap) {
      const [method, ...pathParts] = key.split(':');
      const normalizedPath = pathParts.join(':');

      const durations = reqs.map(r => r.duration_ms).filter(Boolean).sort((a, b) => a - b);
      const stats = this.calculateStats(durations);
      const failed = reqs.filter(r => !r.is_success).length;

      const statusCodes: Record<string, number> = {};
      for (const req of reqs) {
        if (req.status_code) {
          statusCodes[req.status_code] = (statusCodes[req.status_code] || 0) + 1;
        }
      }

      // Upsert API endpoint
      const { data: existing } = await this.supabase
        .from('api_endpoints')
        .select('id, request_count')
        .eq('site_id', siteId)
        .eq('method', method)
        .eq('normalized_path', normalizedPath)
        .single();

      if (existing) {
        await this.supabase.from('api_endpoints').update({
          last_seen_at: new Date().toISOString(),
          request_count: (existing.request_count || 0) + reqs.length,
          avg_duration_ms: stats.avg,
          p50_duration_ms: stats.p50,
          p95_duration_ms: stats.p95,
          p99_duration_ms: stats.p99,
          error_rate: reqs.length > 0 ? (failed / reqs.length) * 100 : 0,
          status_codes: statusCodes,
          updated_at: new Date().toISOString(),
        }).eq('id', existing.id);
      } else {
        await this.supabase.from('api_endpoints').insert({
          site_id: siteId,
          method,
          normalized_path: normalizedPath,
          first_seen_at: new Date().toISOString(),
          last_seen_at: new Date().toISOString(),
          request_count: reqs.length,
          avg_duration_ms: stats.avg,
          p50_duration_ms: stats.p50,
          p95_duration_ms: stats.p95,
          p99_duration_ms: stats.p99,
          error_rate: reqs.length > 0 ? (failed / reqs.length) * 100 : 0,
          status_codes: statusCodes,
        });
      }
    }
  }

  private calculateStats(sorted: number[]): {
    sum: number; avg: number; min: number; max: number;
    p50: number | null; p95: number | null; p99: number | null;
  } {
    if (sorted.length === 0) {
      return { sum: 0, avg: 0, min: 0, max: 0, p50: null, p95: null, p99: null };
    }

    const sum = sorted.reduce((a, b) => a + b, 0);
    return {
      sum,
      avg: sum / sorted.length,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      p50: this.percentile(sorted, 50),
      p95: this.percentile(sorted, 95),
      p99: this.percentile(sorted, 99),
    };
  }

  private percentile(sorted: number[], p: number): number {
    if (sorted.length === 0) return 0;
    const idx = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[Math.max(0, Math.min(idx, sorted.length - 1))];
  }
}
