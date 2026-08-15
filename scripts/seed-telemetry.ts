// ============================================================
// Adaptive Web Observability — Realistic Telemetry Seed Script
// Generates realistic multi-session telemetry through the real
// database pipeline to populate dashboards without mock data.
// ============================================================

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function seed() {
  console.log('[Seed] Starting telemetry generation...');

  // 1. Ensure a default organization exists
  let { data: org } = await supabase.from('organizations').select('id').limit(1).maybeSingle();
  if (!org) {
    const { data: newOrg } = await supabase
      .from('organizations')
      .insert({ name: 'Acme SaaS Corp', slug: 'acme-saas', plan: 'pro' })
      .select()
      .single();
    org = newOrg;
  }
  const orgId = org!.id;

  // 2. Ensure a default project exists
  let { data: project } = await supabase.from('projects').select('id').eq('organization_id', orgId).limit(1).maybeSingle();
  if (!project) {
    const { data: newProj } = await supabase
      .from('projects')
      .insert({ name: 'Production Storefront', organization_id: orgId })
      .select()
      .single();
    project = newProj;
  }
  const projectId = project!.id;

  // 3. Ensure a monitored site exists
  let { data: site } = await supabase.from('sites').select('id').eq('domain', 'store.acme.com').maybeSingle();
  if (!site) {
    const { data: newSite } = await supabase
      .from('sites')
      .insert({
        name: 'Acme Online Store',
        domain: 'store.acme.com',
        organization_id: orgId,
        project_id: projectId,
        sdk_detected: true,
        last_event_at: new Date().toISOString(),
      })
      .select()
      .single();
    site = newSite;
  }
  const siteId = site!.id;

  // 4. Ensure API Key exists
  const { data: apiKey } = await supabase.from('api_keys').select('id').eq('site_id', siteId).maybeSingle();
  if (!apiKey) {
    await supabase.from('api_keys').insert({
      site_id: siteId,
      organization_id: orgId,
      key_type: 'public',
      key_prefix: 'pk_live_',
      key_hash: 'demo_key_hash',
      key_preview: 'demo',
      label: 'Demo Public Key',
    });
  }

  console.log(`[Seed] Target Site ID: ${siteId}`);

  // 5. Generate historical sessions & telemetry across the last 24 hours
  const now = Date.now();
  const browsers = ['Chrome', 'Safari', 'Firefox', 'Edge'];
  const osList = ['macOS', 'Windows', 'iOS', 'Android'];
  const routes = ['/', '/pricing', '/products', '/products/:id', '/checkout', '/dashboard'];
  const referrers = ['https://google.com', 'https://github.com', 'https://twitter.com', 'Direct'];

  const sessions: any[] = [];
  const pageViews: any[] = [];
  const errors: any[] = [];
  const networkRequests: any[] = [];
  const performanceMetrics: any[] = [];
  const events: any[] = [];

  for (let i = 0; i < 40; i++) {
    const timeOffsetMs = Math.floor(Math.random() * 24 * 60 * 60 * 1000);
    const sessionStartTime = new Date(now - timeOffsetMs);
    const sessionId = `sess_${i}_${Math.random().toString(36).substring(2, 9)}`;
    const visitorId = `vis_${Math.floor(i / 2)}_${Math.random().toString(36).substring(2, 7)}`;
    const browser = browsers[i % browsers.length];
    const os = osList[i % osList.length];
    const deviceType = os === 'iOS' || os === 'Android' ? 'mobile' : 'desktop';
    const referrer = referrers[i % referrers.length];
    const pageCount = Math.floor(Math.random() * 5) + 1;
    const durationMs = pageCount * (Math.floor(Math.random() * 30000) + 10000);
    const lastActivity = new Date(sessionStartTime.getTime() + durationMs);

    sessions.push({
      id: sessionId,
      site_id: siteId,
      visitor_id: visitorId,
      started_at: sessionStartTime.toISOString(),
      last_activity: lastActivity.toISOString(),
      ended_at: lastActivity.toISOString(),
      duration_ms: durationMs,
      page_count: pageCount,
      event_count: pageCount * 4,
      entry_page: routes[0],
      exit_page: routes[pageCount % routes.length],
      referrer,
      referrer_domain: referrer.includes('http') ? new URL(referrer).hostname : 'Direct',
      device_type: deviceType,
      browser,
      os,
      screen_width: deviceType === 'mobile' ? 390 : 1920,
      screen_height: deviceType === 'mobile' ? 844 : 1080,
      is_bounce: pageCount === 1,
    });

    // Generate Page Views for this session
    for (let p = 0; p < pageCount; p++) {
      const pvTime = new Date(sessionStartTime.getTime() + p * 20000).toISOString();
      const route = routes[p % routes.length];

      pageViews.push({
        site_id: siteId,
        session_id: sessionId,
        visitor_id: visitorId,
        timestamp: pvTime,
        url: `https://store.acme.com${route}`,
        route,
        title: `Acme Store - ${route}`,
        referrer: p === 0 ? referrer : routes[p - 1],
        duration_ms: 20000,
        load_time_ms: Math.floor(Math.random() * 800) + 300,
        is_spa_nav: p > 0,
      });

      // Network request for this page
      const apiDuration = Math.floor(Math.random() * 300) + 40;
      const isFailed = Math.random() < 0.04;
      networkRequests.push({
        site_id: siteId,
        session_id: sessionId,
        visitor_id: visitorId,
        timestamp: pvTime,
        method: p === 2 ? 'POST' : 'GET',
        url: `https://store.acme.com/api${route}`,
        normalized_path: `/api${route}`,
        status_code: isFailed ? 500 : 200,
        duration_ms: isFailed ? apiDuration * 3 : apiDuration,
        is_success: !isFailed,
        initiator_type: 'fetch',
      });

      // Performance metric
      performanceMetrics.push({
        site_id: siteId,
        session_id: sessionId,
        visitor_id: visitorId,
        timestamp: pvTime,
        url: `https://store.acme.com${route}`,
        route,
        dns_ms: Math.floor(Math.random() * 30) + 5,
        connection_ms: Math.floor(Math.random() * 40) + 10,
        tls_ms: Math.floor(Math.random() * 20) + 5,
        ttfb_ms: Math.floor(Math.random() * 150) + 50,
        dom_load_ms: Math.floor(Math.random() * 400) + 200,
        page_load_ms: Math.floor(Math.random() * 700) + 300,
        fcp_ms: Math.floor(Math.random() * 600) + 200,
        lcp_ms: Math.floor(Math.random() * 1200) + 600,
        cls: +(Math.random() * 0.05).toFixed(3),
        inp_ms: Math.floor(Math.random() * 120) + 20,
      });

      // Master event log
      events.push({
        site_id: siteId,
        session_id: sessionId,
        visitor_id: visitorId,
        event_type: 'page_view',
        timestamp: pvTime,
        route,
        metadata: { url: `https://store.acme.com${route}` },
      });
    }

    // Occasional Error
    if (i % 8 === 0) {
      const errTime = new Date(sessionStartTime.getTime() + 15000).toISOString();
      errors.push({
        site_id: siteId,
        session_id: sessionId,
        visitor_id: visitorId,
        timestamp: errTime,
        fingerprint: 'e89ab412',
        error_type: 'TypeError',
        message: "Cannot read properties of undefined (reading 'calculateTotal')",
        stack_trace: "TypeError: Cannot read properties of undefined\n    at Cart.calculateTotal (https://store.acme.com/assets/cart.js:42:15)\n    at Checkout.render (https://store.acme.com/assets/checkout.js:108:22)",
        filename: 'https://store.acme.com/assets/cart.js',
        lineno: 42,
        colno: 15,
        url: 'https://store.acme.com/checkout',
        route: '/checkout',
        browser,
        os,
        is_unhandled: true,
      });
    }
  }

  // Insert batches into Supabase
  console.log(`[Seed] Inserting ${sessions.length} sessions...`);
  await supabase.from('sessions').insert(sessions);

  console.log(`[Seed] Inserting ${pageViews.length} page views...`);
  await supabase.from('page_views').insert(pageViews);

  console.log(`[Seed] Inserting ${networkRequests.length} network requests...`);
  await supabase.from('network_requests').insert(networkRequests);

  console.log(`[Seed] Inserting ${performanceMetrics.length} performance metrics...`);
  await supabase.from('performance_metrics').insert(performanceMetrics);

  console.log(`[Seed] Inserting ${errors.length} JavaScript errors...`);
  if (errors.length > 0) await supabase.from('errors').insert(errors);

  console.log(`[Seed] Inserting ${events.length} master activity events...`);
  await supabase.from('events').insert(events);

  // 6. Populate API Endpoints discovery
  const endpoints = [
    { method: 'GET', normalized_path: '/api/products', request_count: 85, avg_duration_ms: 62, p50_duration_ms: 55, p95_duration_ms: 110, p99_duration_ms: 180, error_rate: 0.5 },
    { method: 'GET', normalized_path: '/api/products/:id', request_count: 140, avg_duration_ms: 78, p50_duration_ms: 68, p95_duration_ms: 145, p99_duration_ms: 220, error_rate: 1.2 },
    { method: 'POST', normalized_path: '/api/cart', request_count: 45, avg_duration_ms: 115, p50_duration_ms: 95, p95_duration_ms: 210, p99_duration_ms: 310, error_rate: 0.0 },
    { method: 'POST', normalized_path: '/api/checkout', request_count: 32, avg_duration_ms: 340, p50_duration_ms: 290, p95_duration_ms: 580, p99_duration_ms: 820, error_rate: 3.1 },
  ];

  for (const ep of endpoints) {
    await supabase.from('api_endpoints').upsert({
      site_id: siteId,
      method: ep.method,
      normalized_path: ep.normalized_path,
      first_seen_at: new Date(now - 24 * 60 * 60 * 1000).toISOString(),
      last_seen_at: new Date().toISOString(),
      request_count: ep.request_count,
      avg_duration_ms: ep.avg_duration_ms,
      p50_duration_ms: ep.p50_duration_ms,
      p95_duration_ms: ep.p95_duration_ms,
      p99_duration_ms: ep.p99_duration_ms,
      error_rate: ep.error_rate,
      status_codes: { '200': ep.request_count - 1, '500': 1 },
    }, { onConflict: 'site_id,method,normalized_path' });
  }

  // 7. Seed Adaptive Baselines
  console.log('[Seed] Setting up adaptive baselines...');
  const baselineMetrics = [
    { name: 'requests_per_hour', mean: 120, stddev: 15 },
    { name: 'errors_per_hour', mean: 2, stddev: 0.8 },
    { name: 'avg_latency', mean: 85, stddev: 12 },
    { name: 'p95_latency', mean: 190, stddev: 25 },
    { name: 'error_rate', mean: 0.8, stddev: 0.2 },
    { name: 'page_views_per_hour', mean: 150, stddev: 20 },
  ];

  for (let hour = 0; hour < 24; hour++) {
    for (const bm of baselineMetrics) {
      await supabase.from('baselines').upsert({
        site_id: siteId,
        metric_name: bm.name,
        time_bucket: 'hour_of_day',
        bucket_value: hour,
        mean: bm.mean,
        stddev: bm.stddev,
        min_value: Math.max(0, bm.mean - 2 * bm.stddev),
        max_value: bm.mean + 2 * bm.stddev,
        sample_count: 24,
        ewma_value: bm.mean,
        last_updated: new Date().toISOString(),
      }, { onConflict: 'site_id,metric_name,dimensions,time_bucket,bucket_value' });
    }
  }

  console.log('[Seed] Telemetry seed completed successfully!');
}

seed().catch(err => {
  console.error('[Seed] Error:', err);
  process.exit(1);
});
