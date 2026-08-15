export enum EventType {
  PageView = 'page_view',
  RouteChange = 'route_change',
  SessionStart = 'session_start',
  SessionEnd = 'session_end',
  Click = 'click',
  CustomEvent = 'custom_event',
  NetworkRequest = 'network_request',
  JavaScriptError = 'javascript_error',
  Performance = 'performance',
  WebVital = 'web_vital',
  ResourceError = 'resource_error',
}

export interface BaseEvent {
  id?: string;
  site_id: string;
  session_id?: string;
  visitor_id?: string;
  timestamp: string;
  event_type: EventType | string;
  route?: string;
  metadata?: Record<string, unknown>;
}

export interface PageViewEvent extends BaseEvent {
  event_type: EventType.PageView | 'page_view';
}

export interface RouteChangeEvent extends BaseEvent {
  event_type: EventType.RouteChange | 'route_change';
}

export interface SessionStartEvent extends BaseEvent {
  event_type: EventType.SessionStart | 'session_start';
}

export interface SessionEndEvent extends BaseEvent {
  event_type: EventType.SessionEnd | 'session_end';
}

export interface ClickEvent extends BaseEvent {
  event_type: EventType.Click | 'click';
  tag?: string;
  text?: string;
  selector?: string;
  coordinates?: { x: number; y: number };
}

export interface CustomEvent extends BaseEvent {
  event_type: EventType.CustomEvent | 'custom_event';
  name?: string;
}

export interface NetworkRequestEvent extends BaseEvent {
  event_type: EventType.NetworkRequest | 'network_request';
  method?: string;
  url?: string;
  normalized_path?: string;
  status_code?: number;
  duration_ms?: number;
  response_size?: number;
  is_success?: boolean;
  error_type?: string;
}

export interface JavaScriptErrorEvent extends BaseEvent {
  event_type: EventType.JavaScriptError | 'javascript_error';
  fingerprint?: string;
  error_type?: string;
  message?: string;
  stack_trace?: string;
  filename?: string;
  lineno?: number;
  colno?: number;
  is_unhandled?: boolean;
}

export interface PerformanceEvent extends BaseEvent {
  event_type: EventType.Performance | 'performance';
  dns_ms?: number;
  connection_ms?: number;
  tls_ms?: number;
  ttfb_ms?: number;
  dom_load_ms?: number;
  page_load_ms?: number;
  fcp_ms?: number;
  lcp_ms?: number;
  cls?: number;
  inp_ms?: number;
}

export interface WebVitalEvent extends BaseEvent {
  event_type: EventType.WebVital | 'web_vital';
  metric_name?: string;
  value?: number;
  rating?: string;
}

export interface ResourceErrorEvent extends BaseEvent {
  event_type: EventType.ResourceError | 'resource_error';
  resource_url?: string;
  resource_type?: string;
  status_code?: number;
}

export interface HeartbeatEvent {
  site_id: string;
  session_id: string;
  visitor_id: string;
  timestamp: string;
}

export interface BatchPayload {
  site_key: string;
  events: BaseEvent[];
}
