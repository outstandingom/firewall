# Security & Privacy Model

Adaptive Web Observability was engineered with a strict **Zero-Trust for Browser Telemetry** philosophy.

---

## 1. Security Architecture

### Key Segregation
- **Public Ingestion Keys (`pk_live_*`)**: Embedded in customer client-side HTML scripts. These keys **ONLY** have write permission to `/v1/events` and `/v1/events/batch`. They **CANNOT** read any dashboard metrics, fetch user records, or alter configurations.
- **Private Management Keys (`sk_live_*`)**: Secret server keys stored only in backend environments for REST API automation.
- **Key Storage**: Keys are hashed with SHA-256 before database insertion; plaintext keys are never stored.

### Ingestion Validation & Abuse Protection
- **Payload Limits**: Max 512KB per request; batches capped at 100 events.
- **Rate Limiting**: Sliding-window limiter enforcing 1,000 events/minute per site key.
- **Timestamp Sanity Windows**: Telemetry older than 24 hours or newer than 5 minutes in the future is rejected.
- **Strict Schema Enforcement**: Every incoming event is validated with Zod schemas.

### Multi-Tenant Isolation
- Every database query strictly filters by `site_id` and verifies membership in the associated `organization_id`.
- Supabase Row-Level Security (RLS) policies enforce database-level boundaries.

---

## 2. Privacy by Design

### Prohibited & Excluded Data
The SDK and ingestion pipeline **NEVER** collect:
- Passwords or input fields of type `password`
- Payment card numbers, CVVs, expiration dates, or bank account details
- Authentication tokens, session cookies, or `Authorization` headers
- Raw keystrokes or arbitrary form text inputs
- Personal Identifiable Information (PII) such as national identification numbers

### Automatic Masking & Redaction
- **URL Parameter Stripping**: Query parameters matching `token`, `key`, `password`, `secret`, `auth`, `credit`, or `card` are stripped before transmission.
- **Element-Level Redaction**: Content marked with `data-monitor-mask="true"` is replaced with `[masked]`.
- **Do Not Track (DNT)**: The SDK honors `navigator.doNotTrack` and `navigator.globalPrivacyControl`.
- **Anonymous Identity**: `visitor_id` is an ephemeral 21-character random token stored in local storage, decoupled from IP addresses or device serials.
