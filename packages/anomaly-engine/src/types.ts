// ============================================================
// Anomaly Engine Types
// ============================================================

export type AnomalySeverity = 'NORMAL' | 'WARNING' | 'CRITICAL';

export interface MetricPoint {
  timestamp: number;
  value: number;
}

export interface BaselineData {
  siteId: string;
  metricName: string;
  dimensions: Record<string, string>;
  timeBucket: string;       // 'hour_of_day' | 'day_of_week'
  bucketValue: number;      // 0-23 for hour, 0-6 for day
  mean: number;
  stddev: number;
  minValue: number;
  maxValue: number;
  sampleCount: number;
  ewmaValue: number;
  lastUpdated: string;
}

export interface AnomalySignal {
  metricName: string;
  currentValue: number;
  expectedValue: number;
  zScore: number;
  percentageChange: number;
  rateOfChange: number;       // value/sec
  anomalyScore: number;       // 0-1
  severity: AnomalySeverity;
}

export interface AnomalyResult {
  siteId: string;
  detectedAt: string;
  severity: AnomalySeverity;
  overallScore: number;       // 0-1 combined score
  signals: AnomalySignal[];
  explanation: string;
  details: Record<string, unknown>;
}

export interface AnomalyExplanation {
  summary: string;
  details: string[];
  severity: AnomalySeverity;
  metrics: Array<{
    name: string;
    current: number;
    expected: number;
    unit: string;
  }>;
}

export interface DetectorConfig {
  /** Z-score threshold for WARNING (default 2.5) */
  warningThreshold: number;
  /** Z-score threshold for CRITICAL (default 3.5) */
  criticalThreshold: number;
  /** EWMA smoothing factor alpha (default 0.3) */
  ewmaAlpha: number;
  /** Minimum samples before baseline is valid (default 10) */
  minSamples: number;
  /** Percentage change threshold for alerts (default 200 = 200%) */
  percentageChangeThreshold: number;
  /** Weights for combining multiple signals */
  signalWeights: {
    traffic: number;
    errorRate: number;
    latency: number;
    apiHealth: number;
  };
}

export const DEFAULT_DETECTOR_CONFIG: DetectorConfig = {
  warningThreshold: 2.5,
  criticalThreshold: 3.5,
  ewmaAlpha: 0.3,
  minSamples: 10,
  percentageChangeThreshold: 200,
  signalWeights: {
    traffic: 0.25,
    errorRate: 0.30,
    latency: 0.25,
    apiHealth: 0.20,
  },
};
