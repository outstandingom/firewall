// ============================================================
// Alert Processor — Evaluates alert rules against anomalies
// ============================================================

import type { SupabaseClient } from '@supabase/supabase-js';
import type { AnomalyResult } from '../../packages/anomaly-engine/src/types.js';

export class AlertProcessor {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Evaluate alert rules for a given anomaly result.
   */
  async evaluateAlertRules(anomaly: AnomalyResult): Promise<void> {
    // Get alert rules for this site
    const { data: rules } = await this.supabase
      .from('alert_rules')
      .select('*')
      .eq('site_id', anomaly.siteId)
      .eq('is_enabled', true);

    if (!rules || rules.length === 0) return;

    for (const rule of rules) {
      try {
        const shouldTrigger = this.evaluateRule(rule, anomaly);

        if (shouldTrigger) {
          // Check cooldown
          if (rule.last_triggered) {
            const lastTriggered = new Date(rule.last_triggered).getTime();
            const cooldownMs = (rule.cooldown_minutes || 30) * 60000;
            if (Date.now() - lastTriggered < cooldownMs) {
              continue; // Still in cooldown
            }
          }

          await this.triggerAlert(rule, anomaly);
        }
      } catch (err) {
        console.error(`[AlertProcessor] Error evaluating rule ${rule.id}:`, err);
      }
    }
  }

  /**
   * Evaluate a single alert rule against anomaly data.
   */
  private evaluateRule(rule: any, anomaly: AnomalyResult): boolean {
    // Find matching signal
    const signal = anomaly.signals.find(s => s.metricName === rule.metric_name);
    if (!signal) {
      // Check if it's a generic anomaly-based rule
      if (rule.metric_name === 'anomaly_score') {
        return this.evaluateCondition(rule.condition, anomaly.overallScore, rule.threshold);
      }
      return false;
    }

    return this.evaluateCondition(rule.condition, signal.currentValue, rule.threshold);
  }

  private evaluateCondition(condition: string, value: number, threshold: number): boolean {
    switch (condition) {
      case 'gt': return value > threshold;
      case 'gte': return value >= threshold;
      case 'lt': return value < threshold;
      case 'lte': return value <= threshold;
      case 'change_pct':
        // For percentage change, we compare absolute change
        return Math.abs(value) > threshold;
      default: return false;
    }
  }

  private async triggerAlert(rule: any, anomaly: AnomalyResult): Promise<void> {
    const topSignal = anomaly.signals
      .filter(s => s.metricName === rule.metric_name)
      .sort((a, b) => b.anomalyScore - a.anomalyScore)[0];

    const title = `Alert: ${rule.name}`;
    const message = anomaly.explanation ||
      `${rule.metric_name} breached threshold (current: ${topSignal?.currentValue ?? anomaly.overallScore}, threshold: ${rule.threshold})`;

    // Insert alert
    const { error: alertError } = await this.supabase.from('alerts').insert({
      alert_rule_id: rule.id,
      site_id: anomaly.siteId,
      organization_id: rule.organization_id,
      triggered_at: new Date().toISOString(),
      severity: rule.severity || anomaly.severity,
      title,
      message,
      metric_name: rule.metric_name,
      metric_value: topSignal?.currentValue ?? anomaly.overallScore,
      threshold: rule.threshold,
      channels_notified: rule.channels || ['email'],
    });

    if (alertError) {
      console.error('[AlertProcessor] Alert insert error:', alertError.message);
      return;
    }

    // Update last_triggered on the rule
    await this.supabase
      .from('alert_rules')
      .update({ last_triggered: new Date().toISOString() })
      .eq('id', rule.id);

    // Send notifications
    const channels = rule.channels || ['email'];
    for (const channel of channels) {
      await this.sendNotification(channel, { title, message, severity: rule.severity, anomaly });
    }

    console.log(`[AlertProcessor] Alert triggered: ${title}`);
  }

  private async sendNotification(
    channel: string,
    data: { title: string; message: string; severity: string; anomaly: AnomalyResult },
  ): Promise<void> {
    switch (channel) {
      case 'email':
        // Log for now — SMTP integration can be added
        console.log(`[Alert:Email] ${data.severity} — ${data.title}: ${data.message}`);
        break;

      case 'webhook':
        // Future: POST to configured webhook URL
        console.log(`[Alert:Webhook] ${data.severity} — ${data.title}`);
        break;

      case 'slack':
        // Future: Post to Slack webhook
        console.log(`[Alert:Slack] ${data.severity} — ${data.title}`);
        break;

      default:
        console.log(`[Alert:${channel}] ${data.severity} — ${data.title}`);
    }
  }
}
