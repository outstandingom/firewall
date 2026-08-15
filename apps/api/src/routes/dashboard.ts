import { FastifyPluginAsync } from 'fastify';
import supabase from '../lib/supabase.js';
import { authGuard } from '../middleware/auth-guard.js';

export const dashboardRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', authGuard);

  // Helper to calculate date range from query params
  function parseRange(query: any): { from: string; to: string } {
    const now = new Date();
    const to = query.to ? new Date(query.to).toISOString() : now.toISOString();
    let fromDate = new Date(now.getTime() - 24 * 60 * 60 * 1000); // default 24h

    if (query.from) {
      fromDate = new Date(query.from);
    } else if (query.range === '1h') {
      fromDate = new Date(now.getTime() - 60 * 60 * 1000);
    } else if (query.range === '24h') {
      fromDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    } else if (query.range === '7d') {
      fromDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (query.range === '30d') {
      fromDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    return { from: fromDate.toISOString(), to };
  }

  // GET /api/sites/:id/traffic
  fastify.get('/api/sites/:id/traffic', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { from, to } = parseRange(request.query);

    // Fetch sessions in range
    const { data: sessions } = await supabase
      .from('sessions')
      .select('*')
      .eq('site_id', id)
      .gte('started_at', from)
      .lte('started_at', to);

    // Fetch page views in range
    const { data: pageViews } = await supabase
      .from('page_views')
      .select('*')
      .eq('site_id', id)
      .gte('timestamp', from)
      .lte('timestamp', to);

    const sessionList = sessions || [];
    const pvList = pageViews || [];

    const totalSessions = sessionList.length;
    const uniqueVisitorsSet = new Set(sessionList.map(s => s.visitor_id).filter(Boolean));
    const uniqueVisitors = uniqueVisitorsSet.size;
    const totalVisitors = totalSessions;
    const totalPageViews = pvList.length;

    const pagesPerSession = totalSessions > 0 ? +(totalPageViews / totalSessions).toFixed(2) : 0;
    const totalDuration = sessionList.reduce((sum, s) => sum + (s.duration_ms || 0), 0);
    const avgSessionDuration = totalSessions > 0 ? Math.round(totalDuration / totalSessions / 1000) : 0;
    const bounceCount = sessionList.filter(s => s.is_bounce || s.page_count <= 1).length;
    const bounceRate = totalSessions > 0 ? +(bounceCount / totalSessions).toFixed(2) : 0;

    // Top Pages
    const pageCounts: Record<string, number> = {};
    for (const pv of pvList) {
      const p = pv.route || pv.url || '/';
      pageCounts[p] = (pageCounts[p] || 0) + 1;
    }
    const topPages = Object.entries(pageCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([url, views]) => ({ url, views }));

    // Top Referrers
    const refCounts: Record<string, number> = {};
    for (const s of sessionList) {
      const ref = s.referrer_domain || (s.referrer ? new URL(s.referrer, 'http://localhost').hostname : 'Direct');
      refCounts[ref] = (refCounts[ref] || 0) + 1;
    }
    const topReferrers = Object.entries(refCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([source, views]) => ({ source, views }));

    // Distributions
    const deviceDistribution: Record<string, number> = {};
    const browserDistribution: Record<string, number> = {};
    const osDistribution: Record<string, number> = {};

    for (const s of sessionList) {
      const dev = s.device_type || 'desktop';
      deviceDistribution[dev] = (deviceDistribution[dev] || 0) + 1;

      const br = s.browser || 'Unknown';
      browserDistribution[br] = (browserDistribution[br] || 0) + 1;

      const os = s.os || 'Unknown';
      osDistribution[os] = (osDistribution[os] || 0) + 1;
    }

    // Traffic over time (hourly buckets)
    const timeBuckets: Record<string, { timestamp: string; views: number; visitors: number; sessions: number }> = {};
    const startMs = new Date(from).getTime();
    const endMs = new Date(to).getTime();
    const isMultiDay = (endMs - startMs) > 2 * 24 * 60 * 60 * 1000;
    const stepMs = isMultiDay ? 24 * 60 * 60 * 1000 : 60 * 60 * 1000;

    for (let t = startMs; t <= endMs; t += stepMs) {
      const d = new Date(t);
      const key = isMultiDay
        ? d.toISOString().split('T')[0]
        : `${d.toISOString().split('T')[0]}T${String(d.getUTCHours()).padStart(2, '0')}:00:00Z`;
      timeBuckets[key] = { timestamp: key, views: 0, visitors: 0, sessions: 0 };
    }

    for (const pv of pvList) {
      const d = new Date(pv.timestamp);
      const key = isMultiDay
        ? d.toISOString().split('T')[0]
        : `${d.toISOString().split('T')[0]}T${String(d.getUTCHours()).padStart(2, '0')}:00:00Z`;
      if (timeBuckets[key]) {
        timeBuckets[key].views++;
      }
    }

    for (const s of sessionList) {
      const d = new Date(s.started_at);
      const key = isMultiDay
        ? d.toISOString().split('T')[0]
        : `${d.toISOString().split('T')[0]}T${String(d.getUTCHours()).padStart(2, '0')}:00:00Z`;
      if (timeBuckets[key]) {
        timeBuckets[key].sessions++;
        timeBuckets[key].visitors++;
      }
    }

    const trafficOverTime = Object.values(timeBuckets).sort((a, b) => a.timestamp.localeCompare(b.timestamp));

    return reply.send({
      visitors: totalVisitors,
      uniqueVisitors,
      sessions: totalSessions,
      pageViews: totalPageViews,
      pagesPerSession,
      avgSessionDuration,
      bounceRate,
      topPages,
      topReferrers,
      deviceDistribution,
      browserDistribution,
      osDistribution,
      trafficOverTime,
    });
  });

  // GET /api/sites/:id/sessions
  fastify.get('/api/sites/:id/sessions', async (request, reply) => {
    const { id } = request.params as { id: string };
    const query = request.query as any;
    const page = parseInt(query.page || '1', 10);
    const limit = parseInt(query.limit || '20', 10);
    const offset = (page - 1) * limit;

    const { data: sessions, count, error } = await supabase
      .from('sessions')
      .select('*', { count: 'exact' })
      .eq('site_id', id)
      .order('started_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      return reply.status(500).send({ error: 'Failed to fetch sessions' });
    }

    return reply.send({
      data: sessions || [],
      total: count || 0,
      page,
      limit,
    });
  });

  // GET /api/sites/:id/sessions/:sessionId
  fastify.get('/api/sites/:id/sessions/:sessionId', async (request, reply) => {
    const { id, sessionId } = request.params as { id: string; sessionId: string };

    const { data: session } = await supabase
      .from('sessions')
      .select('*')
      .eq('site_id', id)
      .eq('id', sessionId)
      .single();

    if (!session) {
      return reply.status(404).send({ error: 'Session not found' });
    }

    const { data: pageViews } = await supabase
      .from('page_views')
      .select('*')
      .eq('session_id', sessionId)
      .order('timestamp', { ascending: true });

    const { data: errors } = await supabase
      .from('errors')
      .select('*')
      .eq('session_id', sessionId)
      .order('timestamp', { ascending: true });

    const { data: networkRequests } = await supabase
      .from('network_requests')
      .select('*')
      .eq('session_id', sessionId)
      .order('timestamp', { ascending: true });

    return reply.send({
      session,
      pageViews: pageViews || [],
      errors: errors || [],
      networkRequests: networkRequests || [],
    });
  });

  // GET /api/sites/:id/errors
  fastify.get('/api/sites/:id/errors', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { from, to } = parseRange(request.query);

    const { data: errorRows } = await supabase
      .from('errors')
      .select('*')
      .eq('site_id', id)
      .gte('timestamp', from)
      .lte('timestamp', to)
      .order('timestamp', { ascending: false });

    const errors = errorRows || [];
    const grouped = new Map<string, any>();

    for (const err of errors) {
      const fp = err.fingerprint || 'default_fingerprint';
      let entry = grouped.get(fp);
      if (!entry) {
        entry = {
          fingerprint: fp,
          message: err.message,
          error_type: err.error_type,
          filename: err.filename,
          lineno: err.lineno,
          colno: err.colno,
          count: 0,
          affected_sessions: new Set<string>(),
          first_seen: err.timestamp,
          last_seen: err.timestamp,
          stack_trace: err.stack_trace,
          browser: err.browser,
          os: err.os,
        };
        grouped.set(fp, entry);
      }
      entry.count++;
      if (err.session_id) entry.affected_sessions.add(err.session_id);
      if (new Date(err.timestamp) < new Date(entry.first_seen)) entry.first_seen = err.timestamp;
      if (new Date(err.timestamp) > new Date(entry.last_seen)) entry.last_seen = err.timestamp;
    }

    const result = Array.from(grouped.values())
      .map(e => ({
        ...e,
        affected_sessions: e.affected_sessions.size,
      }))
      .sort((a, b) => b.count - a.count);

    return reply.send(result);
  });

  // GET /api/sites/:id/errors/:fingerprint
  fastify.get('/api/sites/:id/errors/:fingerprint', async (request, reply) => {
    const { id, fingerprint } = request.params as { id: string; fingerprint: string };

    const { data: occurrences } = await supabase
      .from('errors')
      .select('*')
      .eq('site_id', id)
      .eq('fingerprint', fingerprint)
      .order('timestamp', { ascending: false })
      .limit(100);

    if (!occurrences || occurrences.length === 0) {
      return reply.status(404).send({ error: 'Error fingerprint not found' });
    }

    const first = occurrences[0];
    const browsers: Record<string, number> = {};
    const osList: Record<string, number> = {};

    for (const occ of occurrences) {
      const b = occ.browser || 'Unknown';
      browsers[b] = (browsers[b] || 0) + 1;
      const o = occ.os || 'Unknown';
      osList[o] = (osList[o] || 0) + 1;
    }

    return reply.send({
      fingerprint,
      message: first.message,
      error_type: first.error_type,
      stack_trace: first.stack_trace,
      filename: first.filename,
      lineno: first.lineno,
      colno: first.colno,
      total_occurrences: occurrences.length,
      browserDistribution: browsers,
      osDistribution: osList,
      occurrences,
    });
  });

  // GET /api/sites/:id/apis
  fastify.get('/api/sites/:id/apis', async (request, reply) => {
    const { id } = request.params as { id: string };

    const { data: endpoints } = await supabase
      .from('api_endpoints')
      .select('*')
      .eq('site_id', id)
      .order('request_count', { ascending: false });

    return reply.send(endpoints || []);
  });

  // GET /api/sites/:id/performance
  fastify.get('/api/sites/:id/performance', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { from, to } = parseRange(request.query);

    const { data: metrics } = await supabase
      .from('performance_metrics')
      .select('*')
      .eq('site_id', id)
      .gte('timestamp', from)
      .lte('timestamp', to);

    const list = metrics || [];

    const getP75 = (arr: number[]) => {
      if (arr.length === 0) return 0;
      const sorted = [...arr].sort((a, b) => a - b);
      return sorted[Math.floor(sorted.length * 0.75)] || sorted[0];
    };

    const lcpVals = list.map(m => m.lcp_ms).filter((v): v is number => v != null && v > 0);
    const clsVals = list.map(m => m.cls).filter((v): v is number => v != null && v >= 0);
    const inpVals = list.map(m => m.inp_ms).filter((v): v is number => v != null && v > 0);
    const fcpVals = list.map(m => m.fcp_ms).filter((v): v is number => v != null && v > 0);
    const ttfbVals = list.map(m => m.ttfb_ms).filter((v): v is number => v != null && v > 0);
    const pageLoadVals = list.map(m => m.page_load_ms).filter((v): v is number => v != null && v > 0);

    const lcpP75 = getP75(lcpVals);
    const clsP75 = getP75(clsVals);
    const inpP75 = getP75(inpVals);
    const fcpP75 = getP75(fcpVals);
    const ttfbP75 = getP75(ttfbVals);
    const pageLoadP75 = getP75(pageLoadVals);

    return reply.send({
      LCP: {
        p75: lcpP75,
        rating: lcpP75 === 0 ? 'good' : lcpP75 <= 2500 ? 'good' : lcpP75 <= 4000 ? 'needs-improvement' : 'poor',
      },
      CLS: {
        p75: +clsP75.toFixed(3),
        rating: clsP75 <= 0.1 ? 'good' : clsP75 <= 0.25 ? 'needs-improvement' : 'poor',
      },
      INP: {
        p75: inpP75,
        rating: inpP75 === 0 ? 'good' : inpP75 <= 200 ? 'good' : inpP75 <= 500 ? 'needs-improvement' : 'poor',
      },
      FCP: {
        p75: fcpP75,
        rating: fcpP75 === 0 ? 'good' : fcpP75 <= 1800 ? 'good' : fcpP75 <= 3000 ? 'needs-improvement' : 'poor',
      },
      TTFB: {
        p75: ttfbP75,
        rating: ttfbP75 === 0 ? 'good' : ttfbP75 <= 800 ? 'good' : ttfbP75 <= 1800 ? 'needs-improvement' : 'poor',
      },
      pageLoad: {
        p75: pageLoadP75,
      },
      sampleCount: list.length,
    });
  });

  // GET /api/sites/:id/anomalies
  fastify.get('/api/sites/:id/anomalies', async (request, reply) => {
    const { id } = request.params as { id: string };

    const { data: anomalies } = await supabase
      .from('anomalies')
      .select('*')
      .eq('site_id', id)
      .order('detected_at', { ascending: false })
      .limit(50);

    return reply.send(anomalies || []);
  });

  // GET /api/sites/:id/health
  fastify.get('/api/sites/:id/health', async (request, reply) => {
    const { id } = request.params as { id: string };
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

    // Query 24h errors, requests, and performance
    const [
      { count: errorCount },
      { data: requests },
      { data: perf },
      { data: anomalies },
    ] = await Promise.all([
      supabase.from('errors').select('id', { count: 'exact', head: true }).eq('site_id', id).gte('timestamp', oneDayAgo),
      supabase.from('network_requests').select('is_success, duration_ms').eq('site_id', id).gte('timestamp', oneDayAgo),
      supabase.from('performance_metrics').select('lcp_ms, cls, inp_ms').eq('site_id', id).gte('timestamp', oneDayAgo),
      supabase.from('anomalies').select('severity').eq('site_id', id).gte('detected_at', oneDayAgo),
    ]);

    const reqList = requests || [];
    const totalRequests = reqList.length;
    const failedRequests = reqList.filter(r => !r.is_success).length;

    // Reliability score (0-100)
    let reliability = 100;
    if (totalRequests > 0) {
      const errRate = (failedRequests / totalRequests) * 100;
      reliability = Math.max(0, Math.round(100 - errRate * 5));
    }

    // API Health score (0-100)
    let apiHealth = 100;
    if (totalRequests > 0) {
      const avgLat = reqList.reduce((s, r) => s + (r.duration_ms || 0), 0) / totalRequests;
      const latencyPenalty = avgLat > 1000 ? 30 : avgLat > 500 ? 15 : avgLat > 250 ? 5 : 0;
      apiHealth = Math.max(0, 100 - latencyPenalty);
    }

    // Frontend score (0-100)
    const jsErrors = errorCount || 0;
    const frontend = Math.max(0, Math.round(100 - Math.min(jsErrors * 2, 60)));

    // Performance score (0-100)
    let performance = 90;
    const perfList = perf || [];
    if (perfList.length > 0) {
      const avgLcp = perfList.reduce((s, p) => s + (p.lcp_ms || 0), 0) / perfList.length;
      if (avgLcp > 4000) performance = 60;
      else if (avgLcp > 2500) performance = 75;
      else performance = 95;
    }

    // Deduct for active critical anomalies
    const criticalAnomalies = (anomalies || []).filter(a => a.severity === 'CRITICAL').length;
    const anomalyPenalty = criticalAnomalies * 10;

    const overall = Math.max(0, Math.round((performance + reliability + apiHealth + frontend) / 4) - anomalyPenalty);

    const explanations: string[] = [];
    if (overall >= 90) explanations.push('All subsystems operating within optimal baseline thresholds.');
    if (failedRequests > 0) explanations.push(`Observed ${failedRequests} failed API requests in the past 24 hours.`);
    if (jsErrors > 0) explanations.push(`Detected ${jsErrors} JavaScript frontend errors.`);
    if (criticalAnomalies > 0) explanations.push(`${criticalAnomalies} critical anomaly alerts detected.`);

    return reply.send({
      overall,
      performance,
      reliability,
      apiHealth,
      frontend,
      explanations,
    });
  });

  // GET /api/sites/:id/realtime
  fastify.get('/api/sites/:id/realtime', async (request, reply) => {
    const { id } = request.params as { id: string };
    const now = new Date();
    const fiveMinAgo = new Date(now.getTime() - 5 * 60 * 1000).toISOString();

    const [
      { data: recentSessions },
      { data: recentRequests },
      { count: recentErrors },
      { data: recentAnomalies },
    ] = await Promise.all([
      supabase.from('sessions').select('id, visitor_id').eq('site_id', id).gte('last_activity', fiveMinAgo),
      supabase.from('network_requests').select('duration_ms, is_success').eq('site_id', id).gte('timestamp', fiveMinAgo),
      supabase.from('errors').select('id', { count: 'exact', head: true }).eq('site_id', id).gte('timestamp', fiveMinAgo),
      supabase.from('anomalies').select('*').eq('site_id', id).gte('detected_at', fiveMinAgo),
    ]);

    const activeVisitors = new Set((recentSessions || []).map(s => s.visitor_id).filter(Boolean)).size;
    const reqList = recentRequests || [];
    const requestsPerMinute = Math.round((reqList.length / 5));
    const errorsPerMinute = Math.round(((recentErrors || 0) / 5));
    const avgLatency = reqList.length > 0 ? Math.round(reqList.reduce((s, r) => s + (r.duration_ms || 0), 0) / reqList.length) : 0;

    return reply.send({
      activeVisitors,
      requestsPerMinute,
      errorsPerMinute,
      avgLatency,
      currentAnomalies: recentAnomalies || [],
    });
  });
};
