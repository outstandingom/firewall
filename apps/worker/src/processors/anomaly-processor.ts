// ============================================================
// Anomaly Processor — Detects anomalies using baselines
// ============================================================

import type { SupabaseClient } from '@supabase/supabase-js';
import { AnomalyDetector } from '../../../packages/anomaly-engine/src/detector.js';
import { AnomalyScorer } from '../../../packages/anomaly-engine/src/scorer.js';
import { AnomalyExplainer } from '../../../packages/anomaly-engine/src/explainer.js';
import type { BaselineData, AnomalyResult } from '../../../packages/anomaly-engine/src/types.js';

export class AnomalyProcessor {
  private detector: AnomalyDetector;
  private scorer: AnomalyScorer;
  private explainer: AnomalyExplainer;

  constructor(private supabase: SupabaseClient) {
    this.detector = new AnomalyDetector();
    this.scorer = new AnomalyScorer();
    this.explainer = new AnomalyExplainer();
  }

  /**
   * Detect anomalies for all active sites.
   */
  async detectAnomalies(): Promise<AnomalyResult[]> {
    const results: AnomalyResult[] = [];

    const { data: sites } = await this.supabase
      .from('sites')
      .select('id')
      .not('last_event_at', 'is', null);

    if (!sites || sites.length === 0) return results;

    for (const site of sites) {
      try {
        const result = await this.detectForSite(site.id);
        if (result && result.severity !== 'NORMAL') {
          results.push(result);
          await this.storeAnomaly(result);
        }
      } catch (err) {
        console.error(`[AnomalyProcessor] Error for site ${site.id}:`, err);
      }
    }

    return results;
  }

  private async detectForSite(siteId: string): Promise<AnomalyResult | null> {
    const now = new Date();
    const hourOfDay = now.getHours();

    // Load baselines for this site + current hour
    const { data: baselineRows } = await this.supabase
      .from('baselines')
      .select('*')
      .eq('site_id', siteId)
      .eq('time_bucket', 'hour_of_day')
      .eq('bucket_value', hourOfDay);

    if (!baselineRows || baselineRows.length === 0) return null;

    // Convert to BaselineData map
    const baselines = new Map<string, BaselineData>();
    for (const row of baselineRows) {
      baselines.set(row.metric_name, {
        siteId,
        metricName: row.metric_name,
        dimensions: row.dimensions || {},
        timeBucket: row.time_bucket,
        bucketValue: row.bucket_value,
        mean: row.mean,
        stddev: row.stddev,
        minValue: row.min_value,
        maxValue: row.max_value,
        sampleCount: row.sample_count,
        ewmaValue: row.ewma_value,
        lastUpdated: row.last_updated,
      });
    }

    // Get current values (last 5 minutes)
    const fiveMinAgo = new Date(now.getTime() - 300000).toISOString();
    const currentValues = await this.computeCurrentValues(siteId, fiveMinAgo, now.toISOString());

    if (currentValues.size === 0) return null;

    // Detect anomalies
    const signals = this.detector.detectMultiple(baselines, currentValues);

    // Score them
    const result = this.scorer.score(siteId, signals);

    // Explain
    const annotated = this.explainer.annotate(result);

    return annotated;
  }

  private async computeCurrentValues(
    siteId: string,
    from: string,
    to: string,
  ): Promise<Map<string, number>> {
    const values = new Map<string, number>();

    // Requests in window (scale to per-hour for comparison)
    const { count: reqCount } = await this.supabase
      .from('network_requests')
      .select('id', { count: 'exact', head: true })
      .eq('site_id', siteId)
      .gte('timestamp', from)
      .lt('timestamp', to);

    values.set('requests_per_hour', ((reqCount || 0) / 5) * 60); // scale 5 min to 1 hour

    // Errors
    const { count: errorCount } = await this.supabase
      .from('errors')
      .select('id', { count: 'exact', head: true })
      .eq('site_id', siteId)
      .gte('timestamp', from)
      .lt('timestamp', to);

    values.set('errors_per_hour', ((errorCount || 0) / 5) * 60);

    // Latency
    const { data: networkData } = await this.supabase
      .from('network_requests')
      .select('duration_ms, is_success')
      .eq('site_id', siteId)
      .gte('timestamp', from)
      .lt('timestamp', to);

    if (networkData && networkData.length > 0) {
      const durations = networkData.map(r => r.duration_ms).filter(Boolean);
      if (durations.length > 0) {
        values.set('avg_latency', durations.reduce((a, b) => a + b, 0) / durations.length);
        const sorted = [...durations].sort((a, b) => a - b);
        values.set('p95_latency', sorted[Math.ceil(0.95 * sorted.length) - 1] || 0);
      }

      const failed = networkData.filter(r => !r.is_success).length;
      values.set('error_rate', (failed / networkData.length) * 100);
    }

    // Page views
    const { count: pvCount } = await this.supabase
      .from('page_views')
      .select('id', { count: 'exact', head: true })
      .eq('site_id', siteId)
      .gte('timestamp', from)
      .lt('timestamp', to);

    values.set('page_views_per_hour', ((pvCount || 0) / 5) * 60);

    return values;
  }

  private async storeAnomaly(result: AnomalyResult): Promise<void> {
    // Store the most impactful signal as the primary anomaly
    const topSignal = result.signals
      .filter(s => s.severity !== 'NORMAL')
      .sort((a, b) => b.anomalyScore - a.anomalyScore)[0];

    if (!topSignal) return;

    const { error } = await this.supabase.from('anomalies').insert({
      site_id: result.siteId,
      detected_at: result.detectedAt,
      severity: result.severity,
      anomaly_score: result.overallScore,
      metric_name: topSignal.metricName,
      expected_value: topSignal.expectedValue,
      actual_value: topSignal.currentValue,
      z_score: topSignal.zScore,
      explanation: result.explanation,
      details: result.details,
    });

    if (error) {
      console.error('[AnomalyProcessor] Store error:', error.message);
    }
  }
}
