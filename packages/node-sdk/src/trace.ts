// ============================================================
// OpenTelemetry / W3C TraceContext Compatibility Module
// Handles traceparent header (W3C standard: 00-traceid-spanid-flags)
// ============================================================

import { randomBytes } from 'crypto';

export interface SpanContext {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  traceFlags: string;
}

export class TraceContext {
  /**
   * Generates a 16-byte hex Trace ID (32 chars)
   */
  static generateTraceId(): string {
    return randomBytes(16).toString('hex');
  }

  /**
   * Generates an 8-byte hex Span ID (16 chars)
   */
  static generateSpanId(): string {
    return randomBytes(8).toString('hex');
  }

  /**
   * Parses incoming W3C 'traceparent' header: 00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01
   */
  static parseTraceParent(headerValue?: string | null): SpanContext | null {
    if (!headerValue || typeof headerValue !== 'string') return null;

    const parts = headerValue.trim().split('-');
    if (parts.length < 4) return null;

    const [version, traceId, parentSpanId, traceFlags] = parts;
    if (version !== '00' || traceId.length !== 32 || parentSpanId.length !== 16) {
      return null;
    }

    return {
      traceId,
      spanId: this.generateSpanId(),
      parentSpanId,
      traceFlags: traceFlags || '01',
    };
  }

  /**
   * Formats a W3C traceparent header string
   */
  static formatTraceParent(context: SpanContext): string {
    return `00-${context.traceId}-${context.spanId}-${context.traceFlags || '01'}`;
  }

  /**
   * Creates a new root or child span context
   */
  static createSpanContext(parentHeader?: string | null): SpanContext {
    const parent = this.parseTraceParent(parentHeader);
    if (parent) return parent;

    return {
      traceId: this.generateTraceId(),
      spanId: this.generateSpanId(),
      traceFlags: '01',
    };
  }
}
