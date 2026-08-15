export const MAX_BATCH_SIZE = 100;
export const MAX_PAYLOAD_BYTES = 524288; // 512KB
export const MAX_URL_LENGTH = 2048;
export const MAX_STRING_LENGTH = 500;
export const MAX_STACK_TRACE_LENGTH = 8192;
export const MAX_METADATA_BYTES = 10240;
export const SESSION_TIMEOUT_MS = 1800000; // 30 min
export const EVENT_MAX_AGE_MS = 86400000; // 24 hours
export const EVENT_MAX_FUTURE_MS = 300000; // 5 min
export const DEFAULT_RETENTION_DAYS = 90;
export const RATE_LIMIT_EVENTS_PER_MIN = 1000;
export const RATE_LIMIT_API_PER_MIN = 100;
export const API_KEY_PREFIX_PUBLIC = 'pk_live_';
export const API_KEY_PREFIX_PRIVATE = 'sk_live_';

export const ANOMALY_THRESHOLDS = {
  warning: 2.5,
  critical: 3.5
};

export const HEALTH_WEIGHTS = {
  performance: 0.25,
  reliability: 0.25,
  apiHealth: 0.25,
  frontend: 0.25
};
