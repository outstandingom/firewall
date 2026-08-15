// ============================================================
// Event Processor — Routes incoming events to storage tables
// ============================================================

import type { SupabaseClient } from '@supabase/supabase-js';

interface RawEvent {
  id?: string;
  site_id: string;
  session_id?: string;
  visitor_id?: string;
  event_type: string;
  timestamp: string;
  route?: string;
  metadata?: Record<string, unknown>;
}

export class EventProcessor {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Process a batch of raw events — validate, enrich, and route to storage.
   */
  async processBatch(events: RawEvent[]): Promise<{ processed: number; errors: number }> {
    let processed = 0;
    let errors = 0;

    // Group events by type for batch inserts
    const pageViews: any[] = [];
    const jsErrors: any[] = [];
    const networkRequests: any[] = [];
    const performanceMetrics: any[] = [];
    const genericEvents: any[] = [];
    const sessionUpdates = new Map<string, any>();

    for (const event of events) {
      try {
        switch (event.event_type) {
          case 'page_view':
          case 'route_change':
            pageViews.push(this.mapPageView(event));
            this.trackSessionUpdate(sessionUpdates, event);
            break;

          case 'javascript_error':
            jsErrors.push(this.mapError(event));
            break;

          case 'network_request':
            networkRequests.push(this.mapNetworkRequest(event));
            break;

          case 'performance':
          case 'web_vital':
            performanceMetrics.push(this.mapPerformance(event));
            break;

          case 'session_start':
            await this.createSession(event);
            break;

          case 'session_end':
            await this.endSession(event);
            break;

          default:
            genericEvents.push({
              site_id: event.site_id,
              session_id: event.session_id,
              visitor_id: event.visitor_id,
              event_type: event.event_type,
              timestamp: event.timestamp,
              route: event.route,
              metadata: event.metadata || {},
            });
        }
        processed++;
      } catch (err) {
        errors++;
        console.error(`[EventProcessor] Error processing event ${event.event_type}:`, err);
      }
    }

    // Batch insert into respective tables
    await Promise.all([
      this.batchInsert('page_views', pageViews),
      this.batchInsert('errors', jsErrors),
      this.batchInsert('network_requests', networkRequests),
      this.batchInsert('performance_metrics', performanceMetrics),
      this.batchInsert('events', genericEvents),
    ]);

    // Apply session updates
    for (const [sessionId, update] of sessionUpdates) {
      await this.updateSession(sessionId, update);
    }

    // Update site last_event_at
    const siteIds = [...new Set(events.map(e => e.site_id))];
    for (const siteId of siteIds) {
      await this.supabase
        .from('sites')
        .update({ last_event_at: new Date().toISOString(), sdk_detected: true })
        .eq('id', siteId);
    }

    return { processed, errors };
  }

  private mapPageView(event: RawEvent) {
    const meta = (event.metadata || {}) as any;
    return {
      site_id: event.site_id,
      session_id: event.session_id,
      visitor_id: event.visitor_id,
      timestamp: event.timestamp,
      url: meta.url || '',
      route: event.route || meta.route || '',
      title: meta.title || '',
      referrer: meta.referrer || '',
      duration_ms: meta.duration_ms || null,
      load_time_ms: meta.load_time_ms || null,
      is_spa_nav: event.event_type === 'route_change',
    };
  }

  private mapError(event: RawEvent) {
    const meta = (event.metadata || {}) as any;
    return {
      site_id: event.site_id,
      session_id: event.session_id,
      visitor_id: event.visitor_id,
      timestamp: event.timestamp,
      fingerprint: meta.fingerprint || this.generateFingerprint(meta),
      error_type: meta.error_type || 'Error',
      message: (meta.message || '').slice(0, 2000),
      stack_trace: (meta.stack_trace || '').slice(0, 8192),
      filename: meta.filename || null,
      lineno: meta.lineno || null,
      colno: meta.colno || null,
      url: meta.url || '',
      route: event.route || '',
      browser: meta.browser || '',
      os: meta.os || '',
      release_version: meta.release_version || null,
      is_unhandled: meta.is_unhandled !== false,
    };
  }

  private mapNetworkRequest(event: RawEvent) {
    const meta = (event.metadata || {}) as any;
    return {
      site_id: event.site_id,
      session_id: event.session_id,
      visitor_id: event.visitor_id,
      timestamp: event.timestamp,
      method: (meta.method || 'GET').toUpperCase(),
      url: (meta.url || '').slice(0, 2048),
      normalized_path: meta.normalized_path || this.normalizePath(meta.url || ''),
      status_code: meta.status_code || null,
      duration_ms: meta.duration_ms || null,
      request_size: meta.request_size || null,
      response_size: meta.response_size || null,
      is_success: meta.status_code ? meta.status_code < 400 : null,
      error_type: meta.error_type || null,
      initiator_type: meta.initiator_type || null,
    };
  }

  private mapPerformance(event: RawEvent) {
    const meta = (event.metadata || {}) as any;
    return {
      site_id: event.site_id,
      session_id: event.session_id,
      visitor_id: event.visitor_id,
      timestamp: event.timestamp,
      url: meta.url || '',
      route: event.route || '',
      dns_ms: meta.dns_ms ?? null,
      connection_ms: meta.connection_ms ?? null,
      tls_ms: meta.tls_ms ?? null,
      ttfb_ms: meta.ttfb_ms ?? null,
      dom_load_ms: meta.dom_load_ms ?? null,
      page_load_ms: meta.page_load_ms ?? null,
      fcp_ms: meta.fcp_ms ?? null,
      lcp_ms: meta.lcp_ms ?? null,
      cls: meta.cls ?? null,
      inp_ms: meta.inp_ms ?? null,
      resource_count: meta.resource_count ?? null,
      transfer_size: meta.transfer_size ?? null,
    };
  }

  private trackSessionUpdate(updates: Map<string, any>, event: RawEvent) {
    if (!event.session_id) return;
    const existing = updates.get(event.session_id) || { page_count_increment: 0, exit_page: '' };
    existing.page_count_increment++;
    existing.exit_page = event.route || (event.metadata as any)?.url || '';
    existing.last_activity = event.timestamp;
    updates.set(event.session_id, existing);
  }

  private async createSession(event: RawEvent) {
    const meta = (event.metadata || {}) as any;
    const { error } = await this.supabase.from('sessions').upsert({
      id: event.session_id,
      site_id: event.site_id,
      visitor_id: event.visitor_id || '',
      started_at: event.timestamp,
      last_activity: event.timestamp,
      entry_page: event.route || meta.url || '',
      referrer: meta.referrer || '',
      referrer_domain: meta.referrer_domain || '',
      device_type: meta.device_type || '',
      browser: meta.browser || '',
      browser_version: meta.browser_version || '',
      os: meta.os || '',
      os_version: meta.os_version || '',
      screen_width: meta.screen_width || null,
      screen_height: meta.screen_height || null,
      language: meta.language || '',
      timezone: meta.timezone || '',
      utm_source: meta.utm_source || '',
      utm_medium: meta.utm_medium || '',
      utm_campaign: meta.utm_campaign || '',
    }, { onConflict: 'id' });

    if (error) console.error('[EventProcessor] Session create error:', error.message);
  }

  private async endSession(event: RawEvent) {
    if (!event.session_id) return;
    const meta = (event.metadata || {}) as any;

    const { error } = await this.supabase
      .from('sessions')
      .update({
        ended_at: event.timestamp,
        duration_ms: meta.duration_ms || null,
        last_activity: event.timestamp,
      })
      .eq('id', event.session_id);

    if (error) console.error('[EventProcessor] Session end error:', error.message);
  }

  private async updateSession(sessionId: string, update: any) {
    // Get current session
    const { data: session } = await this.supabase
      .from('sessions')
      .select('page_count, is_bounce')
      .eq('id', sessionId)
      .single();

    const newPageCount = (session?.page_count || 0) + update.page_count_increment;

    const { error } = await this.supabase
      .from('sessions')
      .update({
        page_count: newPageCount,
        exit_page: update.exit_page,
        last_activity: update.last_activity,
        is_bounce: newPageCount <= 1,
      })
      .eq('id', sessionId);

    if (error) console.error('[EventProcessor] Session update error:', error.message);
  }

  private async batchInsert(table: string, rows: any[]) {
    if (rows.length === 0) return;

    const { error } = await this.supabase.from(table).insert(rows);
    if (error) {
      console.error(`[EventProcessor] Batch insert error (${table}):`, error.message);
    }
  }

  private generateFingerprint(meta: any): string {
    const input = `${meta.error_type || ''}:${(meta.message || '').slice(0, 200)}:${meta.filename || ''}`;
    let hash = 0x811c9dc5;
    for (let i = 0; i < input.length; i++) {
      hash ^= input.charCodeAt(i);
      hash = (hash * 0x01000193) >>> 0;
    }
    return hash.toString(16).padStart(8, '0');
  }

  private normalizePath(url: string): string {
    try {
      const parsed = new URL(url, 'http://localhost');
      return parsed.pathname
        .replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '/:id')
        .replace(/\/\d+/g, '/:id')
        .replace(/\/[0-9a-f]{16,}/gi, '/:id');
    } catch {
      return url;
    }
  }
}
