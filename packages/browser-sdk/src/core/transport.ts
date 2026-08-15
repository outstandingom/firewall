import { SDKEvent } from './config';

export async function sendBatch(
  endpoint: string,
  siteKey: string,
  events: SDKEvent[],
  retries = 3
): Promise<boolean> {
  if (events.length === 0) return true;

  const url = `${endpoint.replace(/\/$/, '')}/v1/events/batch`;
  const payload = JSON.stringify({ site_key: siteKey, events });

  // Use sendBeacon if page is unloading
  if (document.visibilityState === 'hidden' && navigator.sendBeacon) {
    try {
      const blob = new Blob([payload], { type: 'application/json' });
      navigator.sendBeacon(url, blob);
      return true; // Fire and forget
    } catch (e) {
      // fallback to fetch
    }
  }

  let attempt = 0;
  while (attempt < retries) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Site-Key': siteKey
        },
        body: payload,
        keepalive: true
      });
      if (response.ok) return true;
    } catch (e) {
      // Ignore network error and retry
    }
    
    attempt++;
    if (attempt < retries) {
      // Exponential backoff: 1s, 2s, 4s
      await new Promise(res => setTimeout(res, Math.pow(2, attempt - 1) * 1000));
    }
  }

  return false;
}
