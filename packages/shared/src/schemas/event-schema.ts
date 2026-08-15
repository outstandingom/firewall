import { z } from 'zod';
import { EventType } from '../types/events';
import { MAX_URL_LENGTH, MAX_STRING_LENGTH, MAX_STACK_TRACE_LENGTH } from '../constants';

export const baseEventSchema = z.object({
  id: z.string().uuid().optional(),
  site_id: z.string().trim().max(MAX_STRING_LENGTH),
  session_id: z.string().max(MAX_STRING_LENGTH).optional(),
  visitor_id: z.string().max(MAX_STRING_LENGTH).optional(),
  timestamp: z.string().datetime(), // Validates ISO string
  event_type: z.nativeEnum(EventType).or(z.string().max(MAX_STRING_LENGTH)),
  route: z.string().max(MAX_URL_LENGTH).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const pageViewSchema = baseEventSchema.extend({
  event_type: z.union([z.literal(EventType.PageView), z.literal('page_view')])
});

export const routeChangeSchema = baseEventSchema.extend({
  event_type: z.union([z.literal(EventType.RouteChange), z.literal('route_change')])
});

export const sessionStartSchema = baseEventSchema.extend({
  event_type: z.union([z.literal(EventType.SessionStart), z.literal('session_start')])
});

export const sessionEndSchema = baseEventSchema.extend({
  event_type: z.union([z.literal(EventType.SessionEnd), z.literal('session_end')])
});

export const clickSchema = baseEventSchema.extend({
  event_type: z.union([z.literal(EventType.Click), z.literal('click')]),
  tag: z.string().max(MAX_STRING_LENGTH).optional(),
  text: z.string().max(MAX_STRING_LENGTH).optional(),
  selector: z.string().max(MAX_STRING_LENGTH).optional(),
  coordinates: z.object({
    x: z.number(),
    y: z.number()
  }).optional()
});

export const customEventSchema = baseEventSchema.extend({
  event_type: z.union([z.literal(EventType.CustomEvent), z.literal('custom_event')]),
  name: z.string().max(MAX_STRING_LENGTH).optional()
});

export const networkRequestSchema = baseEventSchema.extend({
  event_type: z.union([z.literal(EventType.NetworkRequest), z.literal('network_request')]),
  method: z.string().max(20).optional(),
  url: z.string().max(MAX_URL_LENGTH).optional(),
  normalized_path: z.string().max(MAX_URL_LENGTH).optional(),
  status_code: z.number().int().min(100).max(599).optional(),
  duration_ms: z.number().nonnegative().optional(),
  response_size: z.number().nonnegative().optional(),
  is_success: z.boolean().optional(),
  error_type: z.string().max(MAX_STRING_LENGTH).optional()
});

export const errorSchema = baseEventSchema.extend({
  event_type: z.union([z.literal(EventType.JavaScriptError), z.literal('javascript_error')]),
  fingerprint: z.string().max(MAX_STRING_LENGTH).optional(),
  error_type: z.string().max(MAX_STRING_LENGTH).optional(),
  message: z.string().max(MAX_STRING_LENGTH).optional(),
  stack_trace: z.string().max(MAX_STACK_TRACE_LENGTH).optional(),
  filename: z.string().max(MAX_URL_LENGTH).optional(),
  lineno: z.number().optional(),
  colno: z.number().optional(),
  is_unhandled: z.boolean().optional()
});

export const performanceSchema = baseEventSchema.extend({
  event_type: z.union([z.literal(EventType.Performance), z.literal('performance')]),
  dns_ms: z.number().nonnegative().optional(),
  connection_ms: z.number().nonnegative().optional(),
  tls_ms: z.number().nonnegative().optional(),
  ttfb_ms: z.number().nonnegative().optional(),
  dom_load_ms: z.number().nonnegative().optional(),
  page_load_ms: z.number().nonnegative().optional(),
  fcp_ms: z.number().nonnegative().optional(),
  lcp_ms: z.number().nonnegative().optional(),
  cls: z.number().nonnegative().optional(),
  inp_ms: z.number().nonnegative().optional()
});

export const webVitalSchema = baseEventSchema.extend({
  event_type: z.union([z.literal(EventType.WebVital), z.literal('web_vital')]),
  metric_name: z.string().max(MAX_STRING_LENGTH).optional(),
  value: z.number().optional(),
  rating: z.string().max(MAX_STRING_LENGTH).optional()
});

export const resourceErrorSchema = baseEventSchema.extend({
  event_type: z.union([z.literal(EventType.ResourceError), z.literal('resource_error')]),
  resource_url: z.string().max(MAX_URL_LENGTH).optional(),
  resource_type: z.string().max(MAX_STRING_LENGTH).optional(),
  status_code: z.number().int().min(100).max(599).optional()
});

export const batchPayloadSchema = z.object({
  site_key: z.string().trim().max(MAX_STRING_LENGTH),
  events: z.array(baseEventSchema).max(100)
});

export const heartbeatSchema = z.object({
  site_id: z.string().trim().max(MAX_STRING_LENGTH),
  session_id: z.string().trim().max(MAX_STRING_LENGTH),
  visitor_id: z.string().trim().max(MAX_STRING_LENGTH),
  timestamp: z.string().datetime()
});
