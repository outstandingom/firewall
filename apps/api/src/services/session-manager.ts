import supabase from '../lib/supabase.js';

const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

export async function finalizeExpiredSessions() {
  const timeoutThreshold = new Date(Date.now() - SESSION_TIMEOUT_MS).toISOString();
  
  // This would ideally be a single RPC or complex query to update where ended_at is null and last_activity < threshold
  const { data, error } = await supabase
    .from('sessions')
    .update({ ended_at: new Date().toISOString() })
    .is('ended_at', null)
    .lt('last_activity', timeoutThreshold)
    .select('id');

  if (error) {
    console.error('Error finalizing sessions:', error);
  } else if (data && data.length > 0) {
    console.log(`Finalized ${data.length} expired sessions`);
  }
}

// Run every 5 minutes
setInterval(finalizeExpiredSessions, 5 * 60 * 1000).unref();
