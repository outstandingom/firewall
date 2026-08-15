// ============================================================
// Session Processor — Finalizes expired sessions
// ============================================================

import type { SupabaseClient } from '@supabase/supabase-js';

export class SessionProcessor {
  private timeout: number;

  constructor(private supabase: SupabaseClient, timeoutMs = 1800000) {
    this.timeout = timeoutMs;
  }

  /**
   * Finalize sessions that have been inactive longer than the timeout.
   */
  async finalizeExpiredSessions(): Promise<number> {
    const cutoff = new Date(Date.now() - this.timeout).toISOString();

    // Find sessions without an end time where last activity is before cutoff
    const { data: expiredSessions, error } = await this.supabase
      .from('sessions')
      .select('id, started_at, last_activity, page_count')
      .is('ended_at', null)
      .lt('last_activity', cutoff)
      .limit(500);

    if (error) {
      console.error('[SessionProcessor] Query error:', error.message);
      return 0;
    }

    if (!expiredSessions || expiredSessions.length === 0) return 0;

    let finalized = 0;
    for (const session of expiredSessions) {
      const startedAt = new Date(session.started_at).getTime();
      const lastActivity = new Date(session.last_activity).getTime();
      const durationMs = lastActivity - startedAt;

      const { error: updateError } = await this.supabase
        .from('sessions')
        .update({
          ended_at: session.last_activity,
          duration_ms: Math.max(0, durationMs),
          is_bounce: (session.page_count || 0) <= 1,
        })
        .eq('id', session.id);

      if (!updateError) finalized++;
    }

    return finalized;
  }

  /**
   * Get count of active sessions (activity within last N minutes).
   */
  async getActiveSessionCount(siteId: string, windowMinutes = 5): Promise<number> {
    const since = new Date(Date.now() - windowMinutes * 60000).toISOString();

    const { count, error } = await this.supabase
      .from('sessions')
      .select('id', { count: 'exact', head: true })
      .eq('site_id', siteId)
      .gte('last_activity', since)
      .is('ended_at', null);

    if (error) {
      console.error('[SessionProcessor] Active count error:', error.message);
      return 0;
    }

    return count || 0;
  }
}
