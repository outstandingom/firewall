# Database Schema & Data Model

Adaptive Web Observability uses PostgreSQL (hosted on Supabase) with partitioned tables, optimized indexes, and strict multi-tenant isolation.

---

## Entity Relationship Summary

```
organizations
  ├── organization_members (users)
  └── projects
        └── sites
              ├── api_keys
              ├── alert_rules ──> alerts
              ├── baselines
              ├── anomalies
              ├── api_endpoints
              ├── sessions
              ├── page_views
              ├── errors
              ├── network_requests
              ├── performance_metrics
              ├── events
              ├── hourly_metrics
              └── daily_metrics
```

---

## Core Tables

### 1. `users`
Identity table storing credentials and profile details.
- `id` UUID PRIMARY KEY
- `email` VARCHAR(255) UNIQUE NOT NULL
- `password_hash` VARCHAR(255) NOT NULL
- `name` VARCHAR(255) NOT NULL
- `created_at`, `updated_at` TIMESTAMPTZ

### 2. `organizations`
Multi-tenant isolation root entity.
- `id` UUID PRIMARY KEY
- `name` VARCHAR(255) NOT NULL
- `slug` VARCHAR(100) UNIQUE NOT NULL
- `plan` VARCHAR(50) DEFAULT 'free'

### 3. `sites`
Monitored customer web properties.
- `id` UUID PRIMARY KEY
- `project_id` UUID REFERENCES projects
- `organization_id` UUID REFERENCES organizations
- `name` VARCHAR(255) NOT NULL
- `domain` VARCHAR(255) NOT NULL
- `sdk_detected` BOOLEAN DEFAULT FALSE
- `last_event_at`, `last_heartbeat` TIMESTAMPTZ
- `retention_days` INTEGER DEFAULT 90

### 4. `api_keys`
Public ingestion (`pk_live_*`) and private management (`sk_live_*`) keys.
- `id` UUID PRIMARY KEY
- `site_id` UUID REFERENCES sites
- `key_type` VARCHAR(20) NOT NULL (`public` | `private`)
- `key_prefix` VARCHAR(20) NOT NULL
- `key_hash` VARCHAR(255) NOT NULL (SHA-256)
- `key_preview` VARCHAR(20) NOT NULL
- `revoked_at`, `expires_at` TIMESTAMPTZ

---

## Telemetry Tables

### 5. `sessions`
Anonymous session tracking.
- `id` UUID / VARCHAR PRIMARY KEY
- `site_id` UUID NOT NULL
- `visitor_id` VARCHAR(64) NOT NULL (Random client identifier, no PII)
- `started_at`, `last_activity`, `ended_at` TIMESTAMPTZ
- `duration_ms`, `page_count`, `event_count` INTEGER
- `entry_page`, `exit_page`, `referrer`, `referrer_domain` VARCHAR
- `device_type`, `browser`, `os`, `screen_width`, `screen_height`
- `is_bounce` BOOLEAN DEFAULT TRUE

### 6. `page_views`
Full page loads and SPA dynamic route transitions.
- `id` UUID PRIMARY KEY
- `site_id`, `session_id`, `visitor_id`
- `timestamp` TIMESTAMPTZ NOT NULL
- `url`, `route`, `title`, `referrer`
- `duration_ms`, `load_time_ms`
- `is_spa_nav` BOOLEAN

### 7. `errors`
JavaScript runtime errors, resource errors, and unhandled promise rejections.
- `id` UUID PRIMARY KEY
- `site_id`, `session_id`, `visitor_id`
- `timestamp` TIMESTAMPTZ NOT NULL
- `fingerprint` VARCHAR(64) NOT NULL (FNV-1a hash of type + message + filename)
- `error_type` VARCHAR(100)
- `message` TEXT
- `stack_trace` TEXT (capped at 8KB)
- `filename`, `lineno`, `colno`
- `browser`, `os`, `is_unhandled`

### 8. `network_requests`
Monitored `fetch()` and `XMLHttpRequest` executions.
- `id` UUID PRIMARY KEY
- `site_id`, `session_id`, `visitor_id`
- `timestamp` TIMESTAMPTZ NOT NULL
- `method` VARCHAR(10)
- `url` VARCHAR(2048)
- `normalized_path` VARCHAR(2048) (e.g. `/api/users/:id`)
- `status_code` INTEGER
- `duration_ms` INTEGER
- `is_success` BOOLEAN
- `initiator_type` VARCHAR(50) (`fetch` | `xhr` | `express` | `fastify`)

### 9. `performance_metrics`
Navigation timing and Core Web Vitals.
- `id` UUID PRIMARY KEY
- `site_id`, `session_id`, `visitor_id`
- `timestamp` TIMESTAMPTZ NOT NULL
- `dns_ms`, `connection_ms`, `tls_ms`, `ttfb_ms`, `dom_load_ms`, `page_load_ms` REAL
- `fcp_ms`, `lcp_ms`, `cls`, `inp_ms` REAL

---

## Analytics & Intelligence Tables

### 10. `api_endpoints`
Automatically discovered API inventory with running statistics.
- `site_id`, `method`, `normalized_path` (UNIQUE composite)
- `first_seen_at`, `last_seen_at` TIMESTAMPTZ
- `request_count` BIGINT
- `avg_duration_ms`, `p50_duration_ms`, `p95_duration_ms`, `p99_duration_ms` REAL
- `error_rate` REAL
- `status_codes` JSONB

### 11. `baselines`
Adaptive learning metrics per hour-of-day and day-of-week.
- `site_id`, `metric_name`, `dimensions`, `time_bucket`, `bucket_value` (UNIQUE)
- `mean`, `stddev`, `min_value`, `max_value` DOUBLE PRECISION
- `ewma_value` DOUBLE PRECISION (Exponential smoothing $\alpha=0.3$)
- `sample_count` INTEGER

### 12. `anomalies`
Detected statistical deviations and explanations.
- `id` UUID PRIMARY KEY
- `site_id` UUID NOT NULL
- `detected_at` TIMESTAMPTZ NOT NULL
- `severity` VARCHAR(20) (`NORMAL` | `WARNING` | `CRITICAL`)
- `anomaly_score` REAL (0.0 to 1.0)
- `metric_name` VARCHAR(100)
- `expected_value`, `actual_value`, `z_score` DOUBLE PRECISION
- `explanation` TEXT
- `details` JSONB

### 13. `alert_rules` & `alerts`
Configurable alert threshold rules and alert notification history.
