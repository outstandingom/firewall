// ============================================================
// Adaptive Baseline Calculator
// Uses EWMA (Exponentially Weighted Moving Average) and
// running statistics to learn normal behavior for each metric.
// ============================================================

import type { BaselineData, MetricPoint } from './types.js';

export class BaselineCalculator {
  private alpha: number;
  private minSamples: number;

  constructor(alpha = 0.3, minSamples = 10) {
    this.alpha = alpha;
    this.minSamples = minSamples;
  }

  /**
   * Update a baseline with a new data point using Welford's online algorithm
   * for running mean/variance and EWMA for trend tracking.
   */
  updateBaseline(existing: BaselineData | null, newValue: number, timestamp: string): BaselineData {
    if (!existing) {
      return {
        siteId: '',
        metricName: '',
        dimensions: {},
        timeBucket: 'hour_of_day',
        bucketValue: 0,
        mean: newValue,
        stddev: 0,
        minValue: newValue,
        maxValue: newValue,
        sampleCount: 1,
        ewmaValue: newValue,
        lastUpdated: timestamp,
      };
    }

    const n = existing.sampleCount + 1;

    // Welford's online algorithm for running mean and variance
    const oldMean = existing.mean;
    const newMean = oldMean + (newValue - oldMean) / n;

    // Running variance using Welford's method
    // M2 = (n-1) * oldVariance
    const oldVariance = existing.stddev * existing.stddev;
    const oldM2 = (n - 1) * oldVariance;
    const newM2 = oldM2 + (newValue - oldMean) * (newValue - newMean);
    const newVariance = n > 1 ? newM2 / (n - 1) : 0;
    const newStddev = Math.sqrt(newVariance);

    // EWMA update
    const newEwma = this.alpha * newValue + (1 - this.alpha) * existing.ewmaValue;

    return {
      ...existing,
      mean: newMean,
      stddev: newStddev,
      minValue: Math.min(existing.minValue, newValue),
      maxValue: Math.max(existing.maxValue, newValue),
      sampleCount: n,
      ewmaValue: newEwma,
      lastUpdated: timestamp,
    };
  }

  /**
   * Batch update: process multiple data points at once.
   */
  updateBaselineBatch(existing: BaselineData | null, points: MetricPoint[]): BaselineData {
    let baseline = existing;
    for (const point of points) {
      baseline = this.updateBaseline(baseline, point.value, new Date(point.timestamp).toISOString());
    }
    return baseline!;
  }

  /**
   * Check if the baseline has enough samples to be considered valid.
   */
  isBaselineReady(baseline: BaselineData): boolean {
    return baseline.sampleCount >= this.minSamples;
  }

  /**
   * Calculate Z-score: how many standard deviations away from the mean.
   */
  calculateZScore(baseline: BaselineData, currentValue: number): number {
    if (baseline.stddev === 0) {
      // If stddev is zero, any deviation is infinite — cap it
      if (currentValue === baseline.mean) return 0;
      return currentValue > baseline.mean ? 10 : -10;
    }
    return (currentValue - baseline.mean) / baseline.stddev;
  }

  /**
   * Calculate percentage change from baseline mean.
   */
  calculatePercentageChange(baseline: BaselineData, currentValue: number): number {
    if (baseline.mean === 0) {
      return currentValue === 0 ? 0 : 100;
    }
    return ((currentValue - baseline.mean) / Math.abs(baseline.mean)) * 100;
  }

  /**
   * Calculate EWMA-based deviation.
   */
  calculateEwmaDeviation(baseline: BaselineData, currentValue: number): number {
    if (baseline.stddev === 0) {
      if (currentValue === baseline.ewmaValue) return 0;
      return currentValue > baseline.ewmaValue ? 10 : -10;
    }
    return (currentValue - baseline.ewmaValue) / baseline.stddev;
  }

  /**
   * Get the expected range (mean ± k*stddev).
   */
  getExpectedRange(baseline: BaselineData, k = 2): { lower: number; upper: number } {
    return {
      lower: Math.max(0, baseline.mean - k * baseline.stddev),
      upper: baseline.mean + k * baseline.stddev,
    };
  }

  /**
   * Compute baseline from an array of historical values.
   * Useful for initial baseline setup.
   */
  computeFromHistory(values: number[]): Pick<BaselineData, 'mean' | 'stddev' | 'minValue' | 'maxValue' | 'sampleCount' | 'ewmaValue'> {
    if (values.length === 0) {
      return { mean: 0, stddev: 0, minValue: 0, maxValue: 0, sampleCount: 0, ewmaValue: 0 };
    }

    const n = values.length;
    const mean = values.reduce((sum, v) => sum + v, 0) / n;
    const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / (n > 1 ? n - 1 : 1);
    const stddev = Math.sqrt(variance);

    // Compute EWMA from the series
    let ewma = values[0];
    for (let i = 1; i < n; i++) {
      ewma = this.alpha * values[i] + (1 - this.alpha) * ewma;
    }

    return {
      mean,
      stddev,
      minValue: Math.min(...values),
      maxValue: Math.max(...values),
      sampleCount: n,
      ewmaValue: ewma,
    };
  }
}
