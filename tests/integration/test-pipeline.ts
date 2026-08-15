// ============================================================
// End-to-End Integration Test Suite
// Verifies full telemetry ingestion, processing, aggregation,
// and anomaly detection lifecycle.
// ============================================================

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';
import { randomUUID } from 'crypto';
import { fileURLToPath } from 'url';
import { processEvents } from '../../apps/api/src/services/event-processor.js';
import { AnomalyDetector } from '../../packages/anomaly-engine/src/detector.js';
import { AnomalyScorer } from '../../packages/anomaly-engine/src/scorer.js';
import { AnomalyExplainer } from '../../packages/anomaly-engine/src/explainer.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function runIntegrationTests() {
  console.log('====================================================');
  console.log('RUNNING ADAPTIVE WEB OBSERVABILITY INTEGRATION TESTS');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  async function test(name: string, fn: () => Promise<void>) {
    process.stdout.write(`• Testing: ${name}... `);
    try {
      await fn();
      console.log('✅ PASSED');
      passed++;
    } catch (err: any) {
      console.log('❌ FAILED');
      console.error('  Error:', err.message);
      failed++;
    }
  }

  const testSiteId = randomUUID();
  const testSessionId = randomUUID();

  // Test 1: Database connectivity
  await test('Supabase Database Connectivity', async () => {
    const { error } = await supabase.from('sites').select('id').limit(1);
    if (error) throw error;
  });

  // Test 2: Ingestion & Event Processing Pipeline
  await test('Telemetry Event Ingestion & Table Routing', async () => {
    const testEvents = [
      {
        site_id: testSiteId,
        session_id: testSessionId,
        visitor_id: 'test_vis_001',
        event_type: 'page_view',
        timestamp: new Date().toISOString(),
        route: '/checkout',
        metadata: { url: 'https://test.com/checkout', duration_ms: 1500 },
      },
      {
        site_id: testSiteId,
        session_id: testSessionId,
        visitor_id: 'test_vis_001',
        event_type: 'network_request',
        timestamp: new Date().toISOString(),
        route: '/api/checkout',
        metadata: {
          method: 'POST',
          url: 'https://test.com/api/checkout',
          normalized_path: '/api/checkout',
          status_code: 200,
          duration_ms: 245,
          is_success: true,
        },
      },
      {
        site_id: testSiteId,
        session_id: testSessionId,
        visitor_id: 'test_vis_001',
        event_type: 'javascript_error',
        timestamp: new Date().toISOString(),
        route: '/checkout',
        metadata: {
          error_type: 'ReferenceError',
          message: 'PaymentGateway is not defined',
          stack_trace: 'ReferenceError: PaymentGateway is not defined at https://test.com/app.js:10:5',
          fingerprint: 'fp_test_123',
        },
      },
      {
        site_id: testSiteId,
        session_id: testSessionId,
        visitor_id: 'test_vis_001',
        event_type: 'performance',
        timestamp: new Date().toISOString(),
        route: '/checkout',
        metadata: {
          dns_ms: 15,
          connection_ms: 25,
          ttfb_ms: 120,
          page_load_ms: 650,
          lcp_ms: 1100,
          cls: 0.02,
        },
      },
    ];

    await processEvents(testEvents);

    // Verify insertion in page_views
    const { data: pv } = await supabase.from('page_views').select('id').eq('site_id', testSiteId);
    if (!pv || pv.length === 0) throw new Error('Page views were not persisted to database');

    // Verify insertion in network_requests
    const { data: net } = await supabase.from('network_requests').select('id').eq('site_id', testSiteId);
    if (!net || net.length === 0) throw new Error('Network requests were not persisted');

    // Verify insertion in errors
    const { data: errs } = await supabase.from('errors').select('id').eq('site_id', testSiteId);
    if (!errs || errs.length === 0) throw new Error('Errors were not persisted');
  });

  // Test 3: Anomaly Engine Statistical Detection
  await test('Statistical Anomaly Detection & Scoring', async () => {
    const baseline = {
      siteId: testSiteId,
      metricName: 'error_rate',
      dimensions: {},
      timeBucket: 'hour_of_day',
      bucketValue: 12,
      mean: 1.0,
      stddev: 0.2,
      minValue: 0.5,
      maxValue: 1.5,
      sampleCount: 30,
      ewmaValue: 1.0,
      lastUpdated: new Date().toISOString(),
    };

    const detector = new AnomalyDetector();
    const scorer = new AnomalyScorer();
    const explainer = new AnomalyExplainer();

    // Normal case (1.1% error rate)
    const normalSignal = detector.detect(baseline, 1.1, 'error_rate');
    if (normalSignal.severity !== 'NORMAL') {
      throw new Error(`Expected NORMAL severity for 1.1%, got ${normalSignal.severity}`);
    }

    // Critical anomaly case (15% error rate)
    const anomalousSignal = detector.detect(baseline, 15.0, 'error_rate');
    if (anomalousSignal.severity !== 'CRITICAL') {
      throw new Error(`Expected CRITICAL severity for 15.0%, got ${anomalousSignal.severity}`);
    }

    const scored = scorer.score(testSiteId, [anomalousSignal]);
    const annotated = explainer.annotate(scored);

    if (annotated.overallScore < 0.6) {
      throw new Error(`Expected anomaly score > 0.6, got ${annotated.overallScore}`);
    }

    if (!annotated.explanation || !annotated.explanation.toLowerCase().includes('error rate')) {
      throw new Error(`Invalid explanation generated: "${annotated.explanation}"`);
    }
  });

  // Cleanup test telemetry
  await supabase.from('page_views').delete().eq('site_id', testSiteId);
  await supabase.from('network_requests').delete().eq('site_id', testSiteId);
  await supabase.from('errors').delete().eq('site_id', testSiteId);
  await supabase.from('events').delete().eq('site_id', testSiteId);
  await supabase.from('performance_metrics').delete().eq('site_id', testSiteId);

  console.log('\n----------------------------------------------------');
  console.log(`TEST SUMMARY: ${passed} passed, ${failed} failed`);
  console.log('----------------------------------------------------\n');

  if (failed > 0) process.exit(1);
}

runIntegrationTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
