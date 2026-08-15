// ============================================================
// Anomaly Scorer
// Combines multiple anomaly signals into a single overall score
// and produces an AnomalyResult.
// ============================================================

import type {
  AnomalySignal,
  AnomalyResult,
  AnomalySeverity,
  DetectorConfig,
} from './types.js';
import { DEFAULT_DETECTOR_CONFIG } from './types.js';

export class AnomalyScorer {
  private config: DetectorConfig;

  constructor(config: Partial<DetectorConfig> = {}) {
    this.config = { ...DEFAULT_DETECTOR_CONFIG, ...config };
  }

  /**
   * Score a set of signals into a combined anomaly result.
   */
  score(siteId: string, signals: AnomalySignal[]): AnomalyResult {
    if (signals.length === 0) {
      return {
        siteId,
        detectedAt: new Date().toISOString(),
        severity: 'NORMAL',
        overallScore: 0,
        signals: [],
        explanation: 'No signals to evaluate.',
        details: {},
      };
    }

    // Compute weighted overall score based on metric categories
    const overallScore = this.computeWeightedScore(signals);
    const severity = this.classifyOverallSeverity(signals, overallScore);

    // Build detail summary
    const anomalousSignals = signals.filter(s => s.severity !== 'NORMAL');
    const details: Record<string, unknown> = {
      totalSignals: signals.length,
      anomalousSignals: anomalousSignals.length,
      criticalCount: signals.filter(s => s.severity === 'CRITICAL').length,
      warningCount: signals.filter(s => s.severity === 'WARNING').length,
      topAnomalies: anomalousSignals
        .sort((a, b) => b.anomalyScore - a.anomalyScore)
        .slice(0, 5)
        .map(s => ({
          metric: s.metricName,
          score: Math.round(s.anomalyScore * 100) / 100,
          zScore: Math.round(s.zScore * 100) / 100,
          current: s.currentValue,
          expected: s.expectedValue,
        })),
    };

    return {
      siteId,
      detectedAt: new Date().toISOString(),
      severity,
      overallScore: Math.round(overallScore * 100) / 100,
      signals,
      explanation: '', // filled by AnomalyExplainer
      details,
    };
  }

  /**
   * Compute weighted score from signals using metric category weights.
   */
  private computeWeightedScore(signals: AnomalySignal[]): number {
    const weights = this.config.signalWeights;

    // Categorize signals
    const categories: Record<string, AnomalySignal[]> = {
      traffic: [],
      errorRate: [],
      latency: [],
      apiHealth: [],
    };

    for (const signal of signals) {
      const category = this.categorizeMetric(signal.metricName);
      if (categories[category]) {
        categories[category].push(signal);
      }
    }

    let totalWeight = 0;
    let weightedSum = 0;

    for (const [category, catSignals] of Object.entries(categories)) {
      if (catSignals.length === 0) continue;

      const weight = weights[category as keyof typeof weights] || 0.25;
      // Use the maximum anomaly score in each category (worst case)
      const maxScore = Math.max(...catSignals.map(s => s.anomalyScore));

      weightedSum += weight * maxScore;
      totalWeight += weight;
    }

    return totalWeight > 0 ? weightedSum / totalWeight : 0;
  }

  /**
   * Categorize a metric name into one of the signal weight categories.
   */
  private categorizeMetric(metricName: string): string {
    const name = metricName.toLowerCase();

    if (name.includes('error') || name.includes('exception') || name.includes('failure')) {
      return 'errorRate';
    }
    if (name.includes('latency') || name.includes('duration') || name.includes('ttfb') ||
        name.includes('lcp') || name.includes('fcp') || name.includes('inp') ||
        name.includes('load_time') || name.includes('response_time')) {
      return 'latency';
    }
    if (name.includes('api') || name.includes('request') || name.includes('endpoint') ||
        name.includes('status_5xx') || name.includes('status_4xx')) {
      return 'apiHealth';
    }
    // Default to traffic
    return 'traffic';
  }

  /**
   * Determine overall severity from signals and combined score.
   */
  private classifyOverallSeverity(signals: AnomalySignal[], overallScore: number): AnomalySeverity {
    // If any signal is CRITICAL, overall is at least WARNING
    const hasCritical = signals.some(s => s.severity === 'CRITICAL');
    const criticalCount = signals.filter(s => s.severity === 'CRITICAL').length;

    // Multiple critical signals or very high score = CRITICAL
    if (criticalCount >= 2 || overallScore >= 0.85) return 'CRITICAL';
    if (hasCritical || overallScore >= 0.60) return 'WARNING';
    return 'NORMAL';
  }
}
