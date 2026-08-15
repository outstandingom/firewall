// ============================================================
// Baseline Processor — Updates adaptive baselines from metrics
// ============================================================

import type { SupabaseClient } from '@supabase/supabase-js';
import { BaselineCalculator } from '../../../packages/anomaly-engine/src/baseline.js';
import type { BaselineData } from '../../../packages/anomaly-engine/src/types.js';

// Note: In production, this would import from the npm package.
// For monorepo dev, we import directly.

export class BaselineProcessor {
  private calculator: BaselineCalculator;

  constructor(private supabase: SupabaseClient) {
    this.calculator = new BaselineCalculator(0.3, 10);
  }

  /**
   * Update baselines for all active sites using recent metric data.
   */
  async updateBaselines(): Promise<void> {
    const { data: sites } = await this.supabase
      .from('sites')
      .select('id')
      .not('last_event_at', 'is', null);

    if (!sites || sites.length === 0) return;

    for (const site of sites) {
      await this.updateSiteBaselines(site.id);
    }
  }

  private async updateSiteBaselines(siteId: string): Promise<void> {
    const now = new Date();
    const hourOfDay = now.getHours();
    const dayOfWeek = now.getDay();
    const oneHourAgo = new Date(now.getTime() - 3600000).toISOString();
    const nowIso = now.toISOString();

    // Compute current metric values from last hour
    const metrics = await this.computeCurrentMetrics(siteId, oneHourAgo, nowIso);

    for (const [metricName, value] of Object.entries(metrics)) {
      // Update hour-of-day baseline
      await this.updateSingleBaseline(siteId, metricName, 'hour_of_day', hourOfDay, value, nowIso);

      // Update day-of-week baseline
      await this.updateSingleBaseline(siteId, metricName, 'day_of_week', dayOfWeek, value, nowIso);
    }
  }

  private async updateSingleBaseline(
    siteId: string,
    metricName: string,
    timeBucket: string,
    bucketValue: number,
    currentValue: number,
    timestamp: string,
  ): Promise<void> {
    // Fetch existing baseline
    const { data: existing } = await this.supabase
      .from('baselines')
      .select('*')
      .eq('site_id', siteId)
      .eq('metric_name', metricName)
      .eq('time_bucket', timeBucket)
      .eq('bucket_value', bucketValue)
      .single();

    let baselineData: BaselineData | null = null;
    if (existing) {
      baselineData = {
        siteId,
        metricName,
        dimensions: existing.dimensions || {},
        timeBucket,
        bucketValue,
        mean: existing.mean,
        stddev: existing.stddev,
        minValue: existing.min_value,
        maxValue: existing.max_value,
        sampleCount: existing.sample_count,
        ewmaValue: existing.ewma_value,
        lastUpdated: existing.last_updated,
      };
    }

    // Update baseline with new value
    const updated = this.calculator.updateBaseline(baselineData, currentValue, timestamp);

    // Upsert to database
    const row = {
      site_id: siteId,
      metric_name: metricName,
      dimensions: {},
      time_bucket: timeBucket,
      bucket_value: bucketValue,
      mean: updated.mean,
      stddev: updated.stddev,
      min_value: updated.minValue,
      max_value: updated.maxValue,
      sample_count: updated.sampleCount,
      ewma_value: updated.ewmaValue,
      last_updated: timestamp,
    };

    if (existing) {
      await this.supabase
        .from('baselines')
        .update(row)
        .eq('id', existing.id);
    } else {
      await this.supabase
        .from('baselines')
        .insert(row);
    }
  }

  private async computeCurrentMetrics(
    siteId: string,
    from: string,
    to: string,
  ): Promise<Record<string, number>> {
    const metrics: Record<string, number> = {};

    // Page views count
    const { count: pvCount } = await this.supabase
      .from('page_views')
      .select('id', { count: 'exact', head: true })
      .eq('site_id', siteId)
      .gte('timestamp', from)
      .lt('timestamp', to);
    metrics['page_views_per_hour'] = pvCount || 0;

    // Error count
    const { count: errorCount } = await this.supabase
      .from('errors')
      .select('id', { count: 'exact', head: true })
      .eq('site_id', siteId)
      .gte('timestamp', from)
      .lt('timestamp', to);
    metrics['errors_per_hour'] = errorCount || 0;

    // Network requests
    const { data: networkData } = await this.supabase
      .from('network_requests')
      .select('duration_ms, is_success')
      .eq('site_id', siteId)
      .gte('timestamp', from)
      .lt('timestamp', to);

    const requests = networkData || [];
    metrics['requests_per_hour'] = requests.length;

    if (requests.length > 0) {
      const durations = requests.map(r => r.duration_ms).filter(Boolean);
      if (durations.length > 0) {
        metrics['avg_latency'] = durations.reduce((a, b) => a + b, 0) / durations.length;
        const sorted = [...durations].sort((a, b) => a - b);
        metrics['p95_latency'] = sorted[Math.ceil(0.95 * sorted.length) - 1] || 0;
        metrics['p99_latency'] = sorted[Math.ceil(0.99 * sorted.length) - 1] || 0;
      }

      const failed = requests.filter(r => !r.is_success).length;
      metrics['error_rate'] = (failed / requests.length) * 100;
    }

    // Sessions
    const { count: sessionCount } = await this.supabase
      .from('sessions')
      .select('id', { count: 'exact', head: true })
      .eq('site_id', siteId)
      .gte('started_at', from)
      .lt('started_at', to);
    metrics['sessions_per_hour'] = sessionCount || 0;

    // Performance - LCP
    const { data: perfData } = await this.supabase
      .from('performance_metrics')
      .select('lcp_ms, fcp_ms, cls, inp_ms, page_load_ms')
      .eq('site_id', siteId)
      .gte('timestamp', from)
      .lt('timestamp', to);

    if (perfData && perfData.length > 0) {
      const lcpValues = perfData.map(p => p.lcp_ms).filter(Boolean);
      if (lcpValues.length > 0) {
        metrics['lcp'] = lcpValues.reduce((a, b) => a + b, 0) / lcpValues.length;
      }
      const fcpValues = perfData.map(p => p.fcp_ms).filter(Boolean);
      if (fcpValues.length > 0) {
        metrics['fcp'] = fcpValues.reduce((a, b) => a + b, 0) / fcpValues.length;
      }
      const clsValues = perfData.map(p => p.cls).filter(v => v != null);
      if (clsValues.length > 0) {
        metrics['cls'] = clsValues.reduce((a, b) => a + b, 0) / clsValues.length;
      }
    }

    return metrics;
  }
}
