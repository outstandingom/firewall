import supabase from '../lib/supabase.js';
import { sseEmitter } from '../routes/sse.js';
import { eventQueue } from '../lib/queue.js';

export async function processEvents(events: any[]) {
  if (!events || events.length === 0) return;

  const pageViews: any[] = [];
  const jsErrors: any[] = [];
  const networkRequests: any[] = [];
  const performanceMetrics: any[] = [];
  const genericEvents: any[] = [];
  const sessionMap = new Map<string, any>();

  for (const raw of events) {
    try {
      const siteId = raw.site_id;
      if (!siteId) continue;

      const eventType = raw.event_type || raw.type || 'custom_event';
      const meta = raw.data || raw.metadata || raw.payload || {};
      const timestamp = raw.timestamp || new Date().toISOString();
      const sessionId = raw.session_id || meta.session_id || null;
      const visitorId = raw.visitor_id || meta.visitor_id || null;
      const route = raw.route || meta.route || (meta.url ? new URL(meta.url, 'http://localhost').pathname : '/');

      // Generic base record (route excluded — not in all tables)
      const baseRecord = {
        site_id: siteId,
        session_id: sessionId,
        visitor_id: visitorId,
        timestamp,
      };
      // Base record with route (for tables that have the column)
      const baseRecordWithRoute = { ...baseRecord, route };

      if (eventType === 'page_view' || eventType === 'route_change') {
        pageViews.push({
          ...baseRecordWithRoute,
          url: raw.url || meta.url || route,
          title: raw.title || meta.title || '',
          referrer: meta.referrer || '',
          duration_ms: meta.duration_ms || null,
          load_time_ms: meta.load_time_ms || null,
          is_spa_nav: eventType === 'route_change' || !!meta.is_spa_nav,
        });

        // Track session update
        if (sessionId) {
          const current = sessionMap.get(sessionId) || {
            id: sessionId,
            site_id: siteId,
            visitor_id: visitorId || 'anonymous',
            started_at: timestamp,
            last_activity: timestamp,
            page_count: 0,
            entry_page: route,
            exit_page: route,
            referrer: meta.referrer || '',
            device_type: meta.device_type || 'desktop',
            browser: meta.browser || 'Chrome',
            os: meta.os || 'Windows',
          };
          current.page_count = (current.page_count || 0) + 1;
          current.exit_page = route;
          current.last_activity = timestamp;
          sessionMap.set(sessionId, current);
        }
      } else if (eventType === 'javascript_error' || eventType === 'error' || eventType === 'js_error' || eventType === 'resource_error') {
        const errorType = meta.error_type || meta.name || 'Error';
        const message = String(meta.message || '').slice(0, 2000);
        const filename = meta.filename || null;
        const fingerprint = meta.fingerprint || generateFingerprint(errorType, message, filename);

        jsErrors.push({
          ...baseRecordWithRoute,
          fingerprint,
          error_type: errorType,
          message,
          stack_trace: String(meta.stack_trace || meta.stack || '').slice(0, 8192),
          filename,
          lineno: meta.lineno ?? null,
          colno: meta.colno ?? null,
          url: meta.url || route,
          browser: meta.browser || 'Chrome',
          os: meta.os || 'Windows',
          release_version: meta.release_version || null,
          is_unhandled: meta.is_unhandled !== false,
        });
      } else if (eventType === 'network_request') {
        // network_requests table has NO route column — use plain baseRecord
        const urlStr = meta.url || meta.request_url || route;
        const normalizedPath = meta.normalized_path || normalizePath(urlStr);
        const statusCode = meta.status_code ?? meta.status ?? 200;
        const isSuccess = meta.is_success ?? meta.success ?? (statusCode < 400);

        networkRequests.push({
          ...baseRecord,
          method: (meta.method || 'GET').toUpperCase(),
          url: String(urlStr).slice(0, 2048),
          normalized_path: normalizedPath,
          status_code: statusCode,
          duration_ms: meta.duration_ms ?? 0,
          request_size: meta.request_size ?? null,
          response_size: meta.response_size ?? null,
          is_success: isSuccess,
          error_type: meta.error_type || null,
          initiator_type: meta.initiator_type || 'fetch',
        });
      } else if (eventType === 'performance' || eventType === 'web_vital' || eventType === 'performance_timing') {
        performanceMetrics.push({
          ...baseRecordWithRoute,
          url: meta.url || route,
          dns_ms: meta.dns_ms ?? null,
          connection_ms: meta.connection_ms ?? null,
          tls_ms: meta.tls_ms ?? null,
          ttfb_ms: meta.ttfb_ms ?? null,
          dom_load_ms: meta.dom_load_ms ?? null,
          page_load_ms: meta.page_load_ms ?? null,
          fcp_ms: meta.fcp_ms ?? (meta.metric_name === 'FCP' ? meta.value : null),
          lcp_ms: meta.lcp_ms ?? (meta.metric_name === 'LCP' ? meta.value : null),
          cls: meta.cls ?? (meta.metric_name === 'CLS' ? meta.value : null),
          inp_ms: meta.inp_ms ?? (meta.metric_name === 'INP' ? meta.value : null),
          resource_count: meta.resource_count ?? null,
          transfer_size: meta.transfer_size ?? null,
        });
      } else {
        genericEvents.push({
          ...baseRecordWithRoute,
          event_type: eventType,
          metadata: meta,
        });
      }

      // Notify real-time listeners via SSE
      sseEmitter.emit('site_update', {
        siteId,
        payload: {
          type: 'event_processed',
          eventType,
          route,
          timestamp,
        },
      });
    } catch (err) {
      console.error('[EventProcessor] Error parsing event:', err);
    }
  }

  // Insert batches into Supabase
  try {
    const promises: Promise<any>[] = [];

    if (pageViews.length > 0) {
      promises.push(supabase.from('page_views').insert(pageViews));
    }
    if (jsErrors.length > 0) {
      promises.push(supabase.from('errors').insert(jsErrors));
    }
    if (networkRequests.length > 0) {
      promises.push(supabase.from('network_requests').insert(networkRequests));
    }
    if (performanceMetrics.length > 0) {
      promises.push(supabase.from('performance_metrics').insert(performanceMetrics));
    }
    if (genericEvents.length > 0) {
      promises.push(supabase.from('events').insert(genericEvents));
    }

    // Upsert sessions
    if (sessionMap.size > 0) {
      const sessionList = Array.from(sessionMap.values());
      promises.push(supabase.from('sessions').upsert(sessionList, { onConflict: 'id' }));
    }

    // Always insert to events table for master activity log
    const masterEvents = events.map(e => {
      const eventMeta = e.data || e.metadata || e.payload || {};
      let route = e.route || '/';
      try {
        if (!e.route && (eventMeta.url || e.url)) {
          route = new URL(eventMeta.url || e.url, 'http://localhost').pathname;
        }
      } catch { /* ignore bad URLs */ }
      return {
        site_id: e.site_id,
        session_id: e.session_id || null,
        visitor_id: e.visitor_id || null,
        event_type: e.event_type || e.type || 'custom_event',
        timestamp: e.timestamp || new Date().toISOString(),
        route,
        metadata: eventMeta,
      };
    });
    promises.push(supabase.from('events').insert(masterEvents));

    const results = await Promise.allSettled(promises);
    const labels = ['page_views', 'errors', 'network_requests', 'performance_metrics', 'generic_events', 'sessions', 'master_events'];
    results.forEach((r, i) => {
      if (r.status === 'rejected') {
        console.error(`[EventProcessor] Insert failed for ${labels[i] || i}:`, r.reason);
      } else if (r.value?.error) {
        console.error(`[EventProcessor] Insert error for ${labels[i] || i}:`, r.value.error.message);
      }
    });
    console.log(`[EventProcessor] Processed batch: ${pageViews.length} pageViews, ${jsErrors.length} errors, ${networkRequests.length} network, ${performanceMetrics.length} perf, ${genericEvents.length} generic, ${sessionMap.size} sessions`);

    // Update site telemetry status
    const uniqueSites = [...new Set(events.map(e => e.site_id).filter(Boolean))];
    for (const siteId of uniqueSites) {
      await supabase.from('sites').update({
        last_event_at: new Date().toISOString(),
        sdk_detected: true,
      }).eq('id', siteId);
    }

    // Update API Endpoint discovery records
    if (networkRequests.length > 0) {
      await updateApiEndpoints(networkRequests);
    }
  } catch (err) {
    console.error('[EventProcessor] Database insert failure:', err);
  }
}

async function updateApiEndpoints(networkRequests: any[]) {
  const endpointMap = new Map<string, { site_id: string; method: string; normalized_path: string; count: number; durations: number[]; errors: number; status_codes: Record<string, number> }>();

  for (const req of networkRequests) {
    const key = `${req.site_id}:${req.method}:${req.normalized_path}`;
    let item = endpointMap.get(key);
    if (!item) {
      item = {
        site_id: req.site_id,
        method: req.method,
        normalized_path: req.normalized_path,
        count: 0,
        durations: [],
        errors: 0,
        status_codes: {},
      };
      endpointMap.set(key, item);
    }
    item.count++;
    if (req.duration_ms != null) item.durations.push(req.duration_ms);
    if (!req.is_success) item.errors++;
    if (req.status_code) {
      item.status_codes[req.status_code] = (item.status_codes[req.status_code] || 0) + 1;
    }
  }

  for (const item of endpointMap.values()) {
    try {
      const avgDuration = item.durations.length > 0 ? item.durations.reduce((a, b) => a + b, 0) / item.durations.length : 0;
      const sorted = [...item.durations].sort((a, b) => a - b);
      const p50 = sorted[Math.floor(sorted.length * 0.5)] || avgDuration;
      const p95 = sorted[Math.floor(sorted.length * 0.95)] || avgDuration;
      const p99 = sorted[Math.floor(sorted.length * 0.99)] || avgDuration;
      const errorRate = (item.errors / item.count) * 100;

      const { data: existing } = await supabase
        .from('api_endpoints')
        .select('*')
        .eq('site_id', item.site_id)
        .eq('method', item.method)
        .eq('normalized_path', item.normalized_path)
        .maybeSingle();

      if (existing) {
        const totalCount = (existing.request_count || 0) + item.count;
        await supabase
          .from('api_endpoints')
          .update({
            request_count: totalCount,
            avg_duration_ms: (existing.avg_duration_ms + avgDuration) / 2,
            p50_duration_ms: p50,
            p95_duration_ms: p95,
            p99_duration_ms: p99,
            error_rate: (existing.error_rate + errorRate) / 2,
            last_seen_at: new Date().toISOString(),
          })
          .eq('id', existing.id);
      } else {
        await supabase.from('api_endpoints').insert({
          site_id: item.site_id,
          method: item.method,
          normalized_path: item.normalized_path,
          first_seen_at: new Date().toISOString(),
          last_seen_at: new Date().toISOString(),
          request_count: item.count,
          avg_duration_ms: avgDuration,
          p50_duration_ms: p50,
          p95_duration_ms: p95,
          p99_duration_ms: p99,
          error_rate: errorRate,
          status_codes: item.status_codes,
        });
      }
    } catch (err) {
      console.error('[EventProcessor] Error updating api_endpoint:', err);
    }
  }
}

function normalizePath(urlStr: string): string {
  try {
    const parsed = new URL(urlStr, 'http://localhost');
    return parsed.pathname
      .replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '/:id')
      .replace(/\/\d+/g, '/:id')
      .replace(/\/[0-9a-f]{16,}/gi, '/:id');
  } catch {
    return urlStr || '/';
  }
}

function generateFingerprint(errorType: string, message: string, filename: string | null): string {
  const input = `${errorType}:${message}:${filename || ''}`;
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = (hash * 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

// Start queue processing
eventQueue.process(processEvents);
