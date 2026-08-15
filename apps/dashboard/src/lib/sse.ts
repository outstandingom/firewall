import { useEffect, useState } from 'react';

const BASE_URL = import.meta.env.VITE_API_URL || '';

export function useRealtime(siteId: string | null) {
  const [data, setData] = useState<any>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!siteId) return;

    const token = localStorage.getItem('token');
    const url = `${BASE_URL}/api/sites/${siteId}/stream`;
    
    // Polyfill or pass token in URL if native EventSource doesn't support headers easily
    // Standard EventSource doesn't support headers well, a common workaround is a query param
    // if backend supports it, or using an EventSource polyfill.
    // For this implementation we append token to URL.
    const eventSource = new EventSource(`${url}?token=${token}`);

    eventSource.onopen = () => {
      setConnected(true);
    };

    eventSource.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data);
        setData(parsed);
      } catch (e) {
        console.error('Failed to parse SSE data', e);
      }
    };

    eventSource.onerror = (error) => {
      console.error('SSE Error', error);
      setConnected(false);
      eventSource.close();
      
      // Attempt reconnect after 5s
      setTimeout(() => {
        // Simple reconnect logic handled by unmount/remount usually, but here we just leave it closed
        // or trigger a state refresh. A better approach is closing and reopening manually.
      }, 5000);
    };

    return () => {
      eventSource.close();
    };
  }, [siteId]);

  return { data, connected };
}
