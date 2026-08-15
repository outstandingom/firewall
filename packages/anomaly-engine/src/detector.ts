// ============================================================
// Anomaly Detector
// Uses multiple statistical signals to detect anomalies:
// - Z-score (deviation from mean)
// - EWMA deviation
// - Percentage change
// - Rate of change
// ============================================================

import { BaselineCalculator } from './baseline.js';
import type {
  BaselineData,
  AnomalySignal,
  AnomalySeverity,
  DetectorConfig,
} from './types.js';
import { DEFAULT_DETECTOR_CONFIG } from './types.js';

export class AnomalyDetector {
  private calculator: BaselineCalculator;
  private config: DetectorConfig;

  constructor(config: Partial<DetectorConfig> = {}) {
    this.config = { ...DEFAULT_DETECTOR_CONFIG, ...config };
    this.calculator = new BaselineCalculator(this.config.ewmaAlpha, this.config.minSamples);
  }

  /**
   * Detect anomaly for a single metric against its baseline.
   */
  detect(
    baseline: BaselineData,
    currentValue: number,
    metricName: string,
    previousValue?: number,
    timeDeltaSeconds?: number,
  ): AnomalySignal {
    // Don't detect anomalies if baseline isn't ready
    if (!this.calculator.isBaselineReady(baseline)) {
      return {
        metricName,
        currentValue,
        expectedValue: baseline.mean,
        zScore: 0,
        percentageChange: 0,
        rateOfChange: 0,
        anomalyScore: 0,
        severity: 'NORMAL',
      };
    }

    const zScore = this.calculator.calculateZScore(baseline, currentValue);
    const percentageChange = this.calculator.calculatePercentageChange(baseline, currentValue);
    const ewmaDeviation = this.calculator.calculateEwmaDeviation(baseline, currentValue);

    // Rate of change (if we have previous value)
    let rateOfChange = 0;
    if (previousValue !== undefined && timeDeltaSeconds && timeDeltaSeconds > 0) {
      rateOfChange = (currentValue - previousValue) / timeDeltaSeconds;
    }

    // Compute anomaly score (0–1) from multiple signals
    const anomalyScore = this.computeAnomalyScore(zScore, ewmaDeviation, percentageChange);
    const severity = this.classifySeverity(zScore);

    return {
      metricName,
      currentValue,
      expectedValue: baseline.mean,
      zScore,
      percentageChange,
      rateOfChange,
      anomalyScore,
      severity,
    };
  }

  /**
   * Detect anomalies across multiple metrics at once.
   */
  detectMultiple(
    baselines: Map<string, BaselineData>,
    currentValues: Map<string, number>,
    previousValues?: Map<string, number>,
    timeDeltaSeconds?: number,
  ): AnomalySignal[] {
    const signals: AnomalySignal[] = [];

    for (const [metricName, currentValue] of currentValues.entries()) {
      const baseline = baselines.get(metricName);
      if (!baseline) continue;

      const previousValue = previousValues?.get(metricName);
      const signal = this.detect(baseline, currentValue, metricName, previousValue, timeDeltaSeconds);
      signals.push(signal);
    }

    return signals;
  }

  /**
   * Compute a normalized anomaly score from multiple signals.
   * Score ranges from 0 (completely normal) to 1 (extreme anomaly).
   */
  private computeAnomalyScore(
    zScore: number,
    ewmaDeviation: number,
    percentageChange: number,
  ): number {
    const absZ = Math.abs(zScore);
    const absEwma = Math.abs(ewmaDeviation);
    const absPctChange = Math.abs(percentageChange);

    // Normalize each signal to 0–1 using sigmoid-like functions
    const zNormalized = this.sigmoid(absZ, 2, 1.5);        // centered at z=2, steepness 1.5
    const ewmaNormalized = this.sigmoid(absEwma, 2, 1.5);
    const pctNormalized = this.sigmoid(absPctChange, 100, 0.03); // centered at 100%, steepness 0.03

    // Weighted combination — Z-score and EWMA are more reliable
    const score = (
      0.40 * zNormalized +
      0.35 * ewmaNormalized +
      0.25 * pctNormalized
    );

    return Math.min(1, Math.max(0, score));
  }

  /**
   * Sigmoid function for smooth normalization: output 0–1.
   * f(x) = 1 / (1 + exp(-steepness * (x - center)))
   */
  private sigmoid(x: number, center: number, steepness: number): number {
    return 1 / (1 + Math.exp(-steepness * (x - center)));
  }

  /**
   * Classify severity based on Z-score thresholds.
   */
  private classifySeverity(zScore: number): AnomalySeverity {
    const absZ = Math.abs(zScore);
    if (absZ >= this.config.criticalThreshold) return 'CRITICAL';
    if (absZ >= this.config.warningThreshold) return 'WARNING';
    return 'NORMAL';
  }

  /**
   * Get the baseline calculator for external use.
   */
  getCalculator(): BaselineCalculator {
    return this.calculator;
  }

  /**
   * Get the current config.
   */
  getConfig(): DetectorConfig {
    return { ...this.config };
  }
}
