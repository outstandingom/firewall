import { User, Site, ErrorRecord, NetworkRequest, PerformanceMetric, Anomaly, Alert, Session } from './models';

export interface RegisterRequest {
  email: string;
  password?: string;
  name?: string;
}

export interface LoginRequest {
  email: string;
  password?: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface CreateSiteRequest {
  name: string;
  domain: string;
  project_id: string;
}

export interface SiteResponse {
  site: Site;
}

export interface SiteOverview {
  site: Site;
  health: number;
  recentTraffic: number;
}

export interface TrafficData {
  pageViews: number;
  uniqueVisitors: number;
}

export interface SessionListResponse {
  sessions: Session[];
}

export interface ErrorListResponse {
  errors: ErrorRecord[];
}

export interface ErrorDetailResponse {
  error: ErrorRecord;
  occurrences: number;
}

export interface ApiMonitorResponse {
  endpoints: NetworkRequest[];
}

export interface PerformanceResponse {
  metrics: PerformanceMetric[];
}

export interface AnomalyListResponse {
  anomalies: Anomaly[];
}

export interface AlertListResponse {
  alerts: Alert[];
}

export type TimeRange = '1h' | '24h' | '7d' | '30d' | 'custom';

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
