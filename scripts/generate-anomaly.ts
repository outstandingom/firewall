// ============================================================
// Adaptive Web Observability — Anomaly Simulation & Detection
// Simulates an operational incident (error surge & latency spike)
// and executes the statistical anomaly detection pipeline.
// ============================================================

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { AnomalyDetector } from '../packages/anomaly-engine/src/detector.js';
import { AnomalyScorer } from '../packages/anomaly-engine/src/scorer.js';
import { AnomalyExplainer } from '../packages/anomaly-engine/src/explainer.js';
import type { BaselineData } from '../packages/anomaly-engine/src/types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function runAnomalySimulation() {
  console.log('[AnomalySim] Starting anomaly detection evaluation...');

  // Find active site
  const { data: site } = await supabase.from('sites').select('id, name').limit(1).single();
  if (!site) {
    console.error('No site found. Run seed script first.');
    process.exit(1);
  }

  const siteId = site.id;
  const now = new Date();
  const currentHour = now.getHours();

  // 1. Fetch baselines for current hour
  const { data: baselineRows } = await supabase
    .from('baselines')
    .select('*')
    .eq('site_id', siteId)
    .eq('time_bucket', 'hour_of_day')
    .eq('bucket_value', currentHour);

  const baselines = new Map<string, BaselineData>();
  for (const row of baselineRows || []) {
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

  // 2. Simulate an incident (e.g. downstream payment provider outage)
  // Baseline error_rate is ~0.8%, normal latency ~85ms, normal requests ~120/hr
  // Incident values: error_rate = 18.5%, avg_latency = 1850ms, requests = 2400/hr
  const incidentMetrics = new Map<string, number>([
    ['requests_per_hour', 2400], // 20x spike
    ['error_rate', 18.5],        // 23x spike
    ['avg_latency', 1850],       // 21x spike
    ['errors_per_hour', 440],
  ]);

  console.log('\n[Baseline vs Incident Comparison]');
  for (const [metric, current] of incidentMetrics) {
    const b = baselines.get(metric);
    const expected = b ? b.mean : 'N/A';
    const stddev = b ? b.stddev : 'N/A';
    console.log(`- ${metric}: Expected ~${expected} (±${stddev}) → Observed: ${current}`);
  }

  // 3. Run Anomaly Engine
  const detector = new AnomalyDetector();
  const scorer = new AnomalyScorer();
  const explainer = new AnomalyExplainer();

  const signals = detector.detectMultiple(baselines, incidentMetrics);
  const rawScore = scorer.score(siteId, signals);
  const anomalyResult = explainer.annotate(rawScore);

  console.log('\n[Adaptive Anomaly Engine Evaluation]');
  console.log(`Severity: ${anomalyResult.severity}`);
  console.log(`Overall Anomaly Score: ${anomalyResult.overallScore} / 1.0`);
  console.log(`Generated Explanation:\n"${anomalyResult.explanation}"\n`);

  // 4. Record to Database
  const topSignal = anomalyResult.signals
    .filter(s => s.severity !== 'NORMAL')
    .sort((a, b) => b.anomalyScore - a.anomalyScore)[0];

  const { data: inserted, error } = await supabase.from('anomalies').insert({
    site_id: siteId,
    detected_at: new Date().toISOString(),
    severity: anomalyResult.severity,
    anomaly_score: anomalyResult.overallScore,
    metric_name: topSignal?.metricName || 'error_rate',
    expected_value: topSignal?.expectedValue || 0.8,
    actual_value: topSignal?.currentValue || 18.5,
    z_score: topSignal?.zScore || 88.5,
    explanation: anomalyResult.explanation,
    details: anomalyResult.details,
  }).select().single();

  if (error) {
    console.error('[AnomalySim] Failed to save anomaly to DB:', error.message);
  } else {
    console.log(`[AnomalySim] Successfully persisted anomaly record ${inserted.id} into database!`);
  }
}

runAnomalySimulation().catch(console.error);
