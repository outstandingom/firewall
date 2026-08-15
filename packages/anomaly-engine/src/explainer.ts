// ============================================================
// Anomaly Explainer
// Generates deterministic, human-readable explanations for
// detected anomalies from signal data alone — no LLM needed.
// ============================================================

import type { AnomalyResult, AnomalySignal, AnomalyExplanation } from './types.js';

export class AnomalyExplainer {
  /**
   * Generate a human-readable explanation for an anomaly result.
   */
  explain(result: AnomalyResult): AnomalyExplanation {
    const anomalousSignals = result.signals
      .filter(s => s.severity !== 'NORMAL')
      .sort((a, b) => b.anomalyScore - a.anomalyScore);

    if (anomalousSignals.length === 0) {
      return {
        summary: 'All metrics are within normal ranges.',
        details: [],
        severity: 'NORMAL',
        metrics: [],
      };
    }

    const summary = this.buildSummary(anomalousSignals, result.severity);
    const details = anomalousSignals.map(s => this.explainSignal(s));
    const metrics = anomalousSignals.map(s => ({
      name: this.humanizeMetricName(s.metricName),
      current: Math.round(s.currentValue * 100) / 100,
      expected: Math.round(s.expectedValue * 100) / 100,
      unit: this.getMetricUnit(s.metricName),
    }));

    return {
      summary,
      details,
      severity: result.severity,
      metrics,
    };
  }

  /**
   * Fill the explanation field on an AnomalyResult in-place.
   */
  annotate(result: AnomalyResult): AnomalyResult {
    const explanation = this.explain(result);
    return {
      ...result,
      explanation: explanation.summary,
      details: {
        ...result.details,
        explanationDetails: explanation.details,
        explanationMetrics: explanation.metrics,
      },
    };
  }

  /**
   * Build a top-level summary sentence.
   */
  private buildSummary(signals: AnomalySignal[], severity: string): string {
    if (signals.length === 1) {
      return this.explainSignal(signals[0]);
    }

    const topSignal = signals[0];
    const severityWord = severity === 'CRITICAL' ? 'Critical' : 'Notable';
    const otherCount = signals.length - 1;

    const mainExplanation = this.explainSignal(topSignal);
    return `${severityWord} anomaly detected: ${mainExplanation} Additionally, ${otherCount} other metric${otherCount > 1 ? 's are' : ' is'} outside normal ranges.`;
  }

  /**
   * Generate a human-readable explanation for a single signal.
   */
  private explainSignal(signal: AnomalySignal): string {
    const metricName = this.humanizeMetricName(signal.metricName);
    const unit = this.getMetricUnit(signal.metricName);
    const direction = signal.currentValue > signal.expectedValue ? 'increased' : 'decreased';
    const current = this.formatValue(signal.currentValue, unit);
    const expected = this.formatValue(signal.expectedValue, unit);
    const pctChange = Math.abs(Math.round(signal.percentageChange));

    // Choose the most informative template
    if (signal.metricName.includes('error_rate')) {
      return `${metricName} ${direction} from ${expected} to ${current} (${pctChange}% change).`;
    }

    if (signal.metricName.includes('latency') || signal.metricName.includes('duration')) {
      if (signal.currentValue > signal.expectedValue) {
        return `${metricName} spiked to ${current}, ${pctChange}% above the normal ${expected}.`;
      }
      return `${metricName} dropped to ${current} from the normal ${expected}.`;
    }

    if (signal.metricName.includes('traffic') || signal.metricName.includes('requests') || signal.metricName.includes('visitors')) {
      if (signal.currentValue > signal.expectedValue) {
        return `${metricName} surged to ${current}, ${pctChange}% above the baseline of ${expected}.`;
      }
      return `${metricName} dropped to ${current}, ${pctChange}% below the baseline of ${expected}.`;
    }

    // Generic template
    return `${metricName} ${direction} from ${expected} to ${current} (${pctChange}% change, z-score: ${Math.round(Math.abs(signal.zScore) * 10) / 10}).`;
  }

  /**
   * Convert metric_name to human-readable form.
   */
  private humanizeMetricName(name: string): string {
    const mappings: Record<string, string> = {
      'requests_per_minute': 'Request rate',
      'error_rate': 'Error rate',
      'error_count': 'Error count',
      'js_error_rate': 'JavaScript error rate',
      'api_error_rate': 'API error rate',
      'avg_latency': 'Average latency',
      'p95_latency': 'P95 latency',
      'p99_latency': 'P99 latency',
      'page_load_time': 'Page load time',
      'lcp': 'Largest Contentful Paint',
      'fcp': 'First Contentful Paint',
      'cls': 'Cumulative Layout Shift',
      'inp': 'Interaction to Next Paint',
      'ttfb': 'Time to First Byte',
      'traffic_volume': 'Traffic volume',
      'active_visitors': 'Active visitors',
      'session_count': 'Session count',
      'bounce_rate': 'Bounce rate',
    };

    if (mappings[name]) return mappings[name];

    // Auto-humanize: replace underscores, capitalize words
    return name
      .replace(/_/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase());
  }

  /**
   * Determine the appropriate unit for a metric.
   */
  private getMetricUnit(name: string): string {
    if (name.includes('rate') || name.includes('cls')) return '%';
    if (name.includes('latency') || name.includes('duration') || name.includes('time') ||
        name.includes('lcp') || name.includes('fcp') || name.includes('inp') || name.includes('ttfb')) {
      return 'ms';
    }
    if (name.includes('size') || name.includes('bytes')) return 'bytes';
    return '';
  }

  /**
   * Format a value with its unit.
   */
  private formatValue(value: number, unit: string): string {
    if (unit === '%') {
      return `${Math.round(value * 100) / 100}%`;
    }
    if (unit === 'ms') {
      if (value >= 1000) return `${(value / 1000).toFixed(1)}s`;
      return `${Math.round(value)}ms`;
    }
    if (unit === 'bytes') {
      if (value >= 1048576) return `${(value / 1048576).toFixed(1)}MB`;
      if (value >= 1024) return `${(value / 1024).toFixed(1)}KB`;
      return `${Math.round(value)}B`;
    }
    // For counts, use comma separation
    if (value >= 1000) {
      return value.toLocaleString('en-US', { maximumFractionDigits: 0 });
    }
    return `${Math.round(value * 100) / 100}`;
  }
}
