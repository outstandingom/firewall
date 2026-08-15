import { FastifyPluginAsync } from 'fastify';
import z from 'zod';
import supabase from '../lib/supabase.js';
import { authGuard } from '../middleware/auth-guard.js';
import { generateApiKey } from '../lib/auth.js';

const createSiteSchema = z.object({
  name: z.string().min(1),
  domain: z.string().min(1),
  organization_id: z.string().uuid(),
  project_id: z.string().uuid().optional(),
});

export const siteRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', authGuard);

  fastify.post('/api/sites', async (request, reply) => {
    const parseResult = createSiteSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({ error: 'Bad Request', details: parseResult.error.format() });
    }

    const { name, domain, organization_id, project_id } = parseResult.data;
    const userId = request.user!.id;

    // Verify membership
    const { data: membership } = await supabase
      .from('organization_members')
      .select('id')
      .eq('organization_id', organization_id)
      .eq('user_id', userId)
      .single();

    if (!membership) {
      return reply.status(403).send({ error: 'Forbidden', message: 'User is not a member of this organization' });
    }

    let finalProjectId = project_id;
    if (!finalProjectId) {
      const { data: project } = await supabase
        .from('projects')
        .insert({ name: 'Default Project', organization_id })
        .select()
        .single();
      finalProjectId = project!.id;
    }

    const { data: site, error: siteError } = await supabase
      .from('sites')
      .insert({ name, domain, organization_id, project_id: finalProjectId })
      .select()
      .single();

    if (siteError || !site) {
      return reply.status(500).send({ error: 'Internal Server Error', message: 'Failed to create site' });
    }

    // Auto-generate public key
    const { fullKey, keyHash, keyPreview } = generateApiKey('pk_live_');
    await supabase.from('api_keys').insert({
      site_id: site.id,
      organization_id,
      key_hash: keyHash,
      key_preview: keyPreview,
      key_type: 'public',
      key_prefix: 'pk_live_',
      label: 'Default Public Key',
    });

    return reply.status(201).send({
      message: 'Site created successfully',
      site,
      publicKey: fullKey,
    });
  });

  fastify.get('/api/sites', async (request, reply) => {
    const userId = request.user!.id;
    
    // Get orgs first
    const { data: orgs } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', userId);
      
    if (!orgs || orgs.length === 0) return reply.send([]);

    const orgIds = orgs.map(o => o.organization_id);

    const { data: sites } = await supabase
      .from('sites')
      .select('*')
      .in('organization_id', orgIds)
      .order('created_at', { ascending: false });

    return reply.send(sites || []);
  });

  fastify.get('/api/sites/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = request.user!.id;

    const { data: site, error } = await supabase
      .from('sites')
      .select('*, organizations(organization_members(user_id))')
      .eq('id', id)
      .single();

    if (error || !site) return reply.status(404).send({ error: 'Not Found' });

    const members = (site.organizations as any)?.organization_members || [];
    if (!members.some((m: any) => m.user_id === userId)) {
      return reply.status(403).send({ error: 'Forbidden' });
    }

    // Fetch site API keys
    const { data: keys } = await supabase
      .from('api_keys')
      .select('id, key_prefix, key_preview, key_type, label, created_at, last_used_at, revoked_at')
      .eq('site_id', id);

    return reply.send({
      ...site,
      api_keys: keys || [],
    });
  });

  fastify.get('/api/sites/:id/overview', async (request, reply) => {
    const { id } = request.params as { id: string };
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const fiveMinAgo = new Date(now.getTime() - 5 * 60 * 1000).toISOString();

    const [
      { data: activeSessions },
      { count: eventsToday },
      { count: errorsToday },
      { data: networkRequestsToday },
      { data: anomaliesToday },
    ] = await Promise.all([
      supabase.from('sessions').select('visitor_id').eq('site_id', id).gte('last_activity', fiveMinAgo),
      supabase.from('events').select('id', { count: 'exact', head: true }).eq('site_id', id).gte('timestamp', todayStart),
      supabase.from('errors').select('id', { count: 'exact', head: true }).eq('site_id', id).gte('timestamp', todayStart),
      supabase.from('network_requests').select('duration_ms, is_success').eq('site_id', id).gte('timestamp', todayStart),
      supabase.from('anomalies').select('severity').eq('site_id', id).gte('detected_at', todayStart),
    ]);

    const activeVisitors = new Set((activeSessions || []).map(s => s.visitor_id).filter(Boolean)).size;
    const reqList = networkRequestsToday || [];
    const totalRequests = reqList.length;
    const failedRequests = reqList.filter(r => !r.is_success).length;

    let avgLatencyToday = 0;
    if (totalRequests > 0) {
      avgLatencyToday = Math.round(reqList.reduce((sum, r) => sum + (r.duration_ms || 0), 0) / totalRequests);
    }

    // Health Score calculation
    let healthScore = 95;
    if (totalRequests > 0) {
      const errRate = (failedRequests / totalRequests) * 100;
      if (errRate > 5) healthScore -= 20;
      else if (errRate > 1) healthScore -= 10;
    }
    const errCount = errorsToday || 0;
    if (errCount > 50) healthScore -= 20;
    else if (errCount > 10) healthScore -= 10;

    const criticalCount = (anomaliesToday || []).filter(a => a.severity === 'CRITICAL').length;
    healthScore = Math.max(0, healthScore - criticalCount * 15);

    return reply.send({
      healthScore,
      activeVisitors,
      totalEventsToday: eventsToday || 0,
      errorCountToday: errorsToday || 0,
      avgLatencyToday,
    });
  });

  fastify.put('/api/sites/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as any;

    const { data: updated, error } = await supabase
      .from('sites')
      .update({
        name: body.name,
        domain: body.domain,
        settings: body.settings,
        retention_days: body.retention_days,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return reply.status(500).send({ error: 'Failed to update site' });
    }

    return reply.send(updated);
  });

  fastify.delete('/api/sites/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    await supabase.from('sites').delete().eq('id', id);
    return reply.send({ message: 'Site deleted successfully' });
  });
};
