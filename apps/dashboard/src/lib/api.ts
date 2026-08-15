import { supabase } from './supabase';

const BASE_URL = import.meta.env.VITE_API_URL || '';

async function fetchWithAuth(url: string, options: RequestInit = {}) {
  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');

  const { data: { session } } = await supabase.auth.getSession();
  if (session?.access_token) {
    headers.set('Authorization', `Bearer ${session.access_token}`);
  }

  const response = await fetch(`${BASE_URL}${url}`, { ...options, headers });
  
  if (response.status === 401) {
    await supabase.auth.signOut();
    window.location.href = '/login';
  }
  
  if (!response.ok) {
    const err = await response.json().catch(() => ({ message: 'API Error' }));
    throw new Error(err.message || 'API Error');
  }
  
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

export const api = {
  // Auth
  register: (data: any) => fetchWithAuth('/api/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  login: (data: any) => fetchWithAuth('/api/auth/login', { method: 'POST', body: JSON.stringify(data) }),
  getMe: () => fetchWithAuth('/api/auth/me'),

  // Sites
  getSites: () => fetchWithAuth('/api/sites'),
  createSite: (data: any) => fetchWithAuth('/api/sites', { method: 'POST', body: JSON.stringify(data) }),
  getSite: (id: string) => fetchWithAuth(`/api/sites/${id}`),
  getSiteOverview: (id: string) => fetchWithAuth(`/api/sites/${id}/overview`),
  
  // Dashboard Data
  getTraffic: (id: string, params?: any) => fetchWithAuth(`/api/sites/${id}/traffic${params ? '?' + new URLSearchParams(params) : ''}`),
  getSessions: (id: string, params?: any) => fetchWithAuth(`/api/sites/${id}/sessions${params ? '?' + new URLSearchParams(params) : ''}`),
  getErrors: (id: string, params?: any) => fetchWithAuth(`/api/sites/${id}/errors${params ? '?' + new URLSearchParams(params) : ''}`),
  getErrorDetail: (siteId: string, errorId: string) => fetchWithAuth(`/api/sites/${siteId}/errors/${errorId}`),
  getApis: (id: string) => fetchWithAuth(`/api/sites/${id}/apis`),
  getPerformance: (id: string) => fetchWithAuth(`/api/sites/${id}/performance`),
  getAnomalies: (id: string) => fetchWithAuth(`/api/sites/${id}/anomalies`),
  getHealth: (id: string) => fetchWithAuth(`/api/sites/${id}/health`),
  getRealtime: (id: string) => fetchWithAuth(`/api/sites/${id}/realtime`),

  // Alerts
  getAlerts: (id: string) => fetchWithAuth(`/api/sites/${id}/alerts`),
  createAlert: (id: string, data: any) => fetchWithAuth(`/api/sites/${id}/alerts`, { method: 'POST', body: JSON.stringify(data) }),
  deleteAlert: (siteId: string, alertId: string) => fetchWithAuth(`/api/sites/${siteId}/alerts/${alertId}`, { method: 'DELETE' }),
  getAlertHistory: (id: string) => fetchWithAuth(`/api/sites/${id}/alerts/history`),

  // API Keys
  getApiKeys: (id: string) => fetchWithAuth(`/api/sites/${id}/keys`),
  createApiKey: (id: string, data: any) => fetchWithAuth(`/api/sites/${id}/keys`, { method: 'POST', body: JSON.stringify(data) }),
  revokeApiKey: (siteId: string, keyId: string) => fetchWithAuth(`/api/sites/${siteId}/keys/${keyId}`, { method: 'DELETE' }),
};
