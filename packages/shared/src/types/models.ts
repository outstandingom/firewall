export interface User {
  id: string;
  email: string;
  name: string;
  created_at: string;
}

export interface Organization {
  id: string;
  name: string;
  created_at: string;
}

export interface OrganizationMember {
  id: string;
  org_id: string;
  user_id: string;
  role: string;
  created_at: string;
}

export interface Project {
  id: string;
  org_id: string;
  name: string;
  created_at: string;
}

export interface Site {
  id: string;
  project_id: string;
  domain: string;
  name: string;
  created_at: string;
}

export interface ApiKey {
  id: string;
  site_id: string;
  key: string;
  type: string;
  created_at: string;
}

export interface Session {
  id: string;
  site_id: string;
  visitor_id: string;
  start_time: string;
  end_time?: string;
  duration_ms?: number;
}

export interface PageView {
  id: string;
  session_id: string;
  site_id: string;
  route: string;
  timestamp: string;
}

export interface ErrorRecord {
  id: string;
  site_id: string;
  fingerprint: string;
  message: string;
  timestamp: string;
}

export interface NetworkRequest {
  id: string;
  site_id: string;
  url: string;
  status_code: number;
  duration_ms: number;
  timestamp: string;
}

export interface PerformanceMetric {
  id: string;
  site_id: string;
  metric_name: string;
  value: number;
  timestamp: string;
}

export interface HourlyMetric {
  id: string;
  site_id: string;
  metric_name: string;
  hour: string;
  value: number;
}

export interface DailyMetric {
  id: string;
  site_id: string;
  metric_name: string;
  date: string;
  value: number;
}

export interface ApiEndpoint {
  id: string;
  site_id: string;
  path: string;
  method: string;
}

export interface Baseline {
  id: string;
  site_id: string;
  metric_name: string;
  value: number;
}

export interface Anomaly {
  id: string;
  site_id: string;
  metric_name: string;
  value: number;
  expected_value: number;
  timestamp: string;
}

export interface AlertRule {
  id: string;
  site_id: string;
  metric_name: string;
  condition: string;
  threshold: number;
}

export interface Alert {
  id: string;
  rule_id: string;
  status: string;
  timestamp: string;
}

export interface HealthScore {
  overall: number;
  performance: number;
  reliability: number;
  apiHealth: number;
  frontend: number;
  explanations: string[];
}
