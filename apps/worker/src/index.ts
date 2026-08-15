// ============================================================
// Worker Entry Point
// Background event processor for the Adaptive Web Observability
// platform. Handles: event processing, session finalization,
// metric aggregation, baseline calculation, anomaly detection.
// ============================================================

import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '../../.env') });

import { createClient } from '@supabase/supabase-js';
import { EventProcessor } from './processors/event-processor.js';
import { SessionProcessor } from './processors/session-processor.js';
import { AggregationProcessor } from './processors/aggregation-processor.js';
import { BaselineProcessor } from './processors/baseline-processor.js';
import { AnomalyProcessor } from './processors/anomaly-processor.js';
import { AlertProcessor } from './processors/alert-processor.js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const AGGREGATION_INTERVAL = parseInt(process.env.AGGREGATION_INTERVAL_MS || '60000', 10);
const SESSION_TIMEOUT = parseInt(process.env.SESSION_TIMEOUT_MS || '1800000', 10);
const BASELINE_INTERVAL = parseInt(process.env.BASELINE_INTERVAL_MS || '300000', 10);

// Initialize processors
const eventProcessor = new EventProcessor(supabase);
const sessionProcessor = new SessionProcessor(supabase, SESSION_TIMEOUT);
const aggregationProcessor = new AggregationProcessor(supabase);
const baselineProcessor = new BaselineProcessor(supabase);
const anomalyProcessor = new AnomalyProcessor(supabase);
const alertProcessor = new AlertProcessor(supabase);

let running = true;

async function startWorker() {
  console.log('[Worker] Starting Adaptive Web Observability Worker...');
  console.log(`[Worker] Aggregation interval: ${AGGREGATION_INTERVAL}ms`);
  console.log(`[Worker] Session timeout: ${SESSION_TIMEOUT}ms`);
  console.log(`[Worker] Baseline interval: ${BASELINE_INTERVAL}ms`);

  // Schedule periodic tasks
  const sessionTimer = setInterval(async () => {
    if (!running) return;
    try {
      const finalized = await sessionProcessor.finalizeExpiredSessions();
      if (finalized > 0) {
        console.log(`[Worker] Finalized ${finalized} expired sessions`);
      }
    } catch (err) {
      console.error('[Worker] Session finalization error:', err);
    }
  }, 60000); // Every minute

  const aggregationTimer = setInterval(async () => {
    if (!running) return;
    try {
      await aggregationProcessor.aggregateCurrentHour();
      console.log('[Worker] Hourly aggregation complete');
    } catch (err) {
      console.error('[Worker] Aggregation error:', err);
    }
  }, AGGREGATION_INTERVAL);

  const baselineTimer = setInterval(async () => {
    if (!running) return;
    try {
      await baselineProcessor.updateBaselines();
      console.log('[Worker] Baseline update complete');
    } catch (err) {
      console.error('[Worker] Baseline error:', err);
    }
  }, BASELINE_INTERVAL);

  const anomalyTimer = setInterval(async () => {
    if (!running) return;
    try {
      const detected = await anomalyProcessor.detectAnomalies();
      if (detected.length > 0) {
        console.log(`[Worker] Detected ${detected.length} anomalies`);
        // Check alert rules
        for (const anomaly of detected) {
          await alertProcessor.evaluateAlertRules(anomaly);
        }
      }
    } catch (err) {
      console.error('[Worker] Anomaly detection error:', err);
    }
  }, BASELINE_INTERVAL);

  // Daily aggregation at midnight
  const dailyTimer = setInterval(async () => {
    if (!running) return;
    try {
      await aggregationProcessor.aggregateYesterday();
      console.log('[Worker] Daily aggregation complete');
    } catch (err) {
      console.error('[Worker] Daily aggregation error:', err);
    }
  }, 3600000); // Check every hour

  // Retention cleanup every 6 hours
  const retentionTimer = setInterval(async () => {
    if (!running) return;
    try {
      await runRetentionCleanup();
    } catch (err) {
      console.error('[Worker] Retention cleanup error:', err);
    }
  }, 21600000);

  console.log('[Worker] All processors started successfully.');

  // Graceful shutdown
  const shutdown = async () => {
    console.log('[Worker] Shutting down...');
    running = false;
    clearInterval(sessionTimer);
    clearInterval(aggregationTimer);
    clearInterval(baselineTimer);
    clearInterval(anomalyTimer);
    clearInterval(dailyTimer);
    clearInterval(retentionTimer);
    console.log('[Worker] Shutdown complete.');
    process.exit(0);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

async function runRetentionCleanup() {
  // Get all sites with retention policies
  const { data: sites } = await supabase
    .from('sites')
    .select('id, retention_days');

  if (!sites) return;

  for (const site of sites) {
    const retentionDays = site.retention_days || 90;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
    const cutoff = cutoffDate.toISOString();

    const tables = ['events', 'page_views', 'errors', 'network_requests', 'performance_metrics'];
    for (const table of tables) {
      const { error } = await supabase
        .from(table)
        .delete()
        .eq('site_id', site.id)
        .lt('timestamp', cutoff);

      if (error) {
        console.error(`[Worker] Retention cleanup error for ${table}:`, error.message);
      }
    }
  }
  console.log('[Worker] Retention cleanup complete');
}

startWorker().catch(err => {
  console.error('[Worker] Fatal error:', err);
  process.exit(1);
});
