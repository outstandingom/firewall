# API Reference

The Adaptive Web Observability platform provides two API surfaces:
1. **Public Ingestion API** (`/v1/*`): High-throughput endpoints used by browser and server SDKs authenticated via public site keys (`pk_live_*`).
2. **Management & Dashboard API** (`/api/*`): Authenticated REST endpoints used by the dashboard and administrators.

---

## 1. Public Ingestion API

### POST `/v1/events`
Submit a single telemetry event.

**Headers:**
- `X-Site-Key`: `pk_live_xxxxxx` (or in payload)
- `Content-Type`: `application/json`

**Body:**
```json
{
  "site_key": "pk_live_xxxxxx",
  "type": "page_view",
  "timestamp": "2026-08-15T21:00:00.000Z",
  "session_id": "sess_abc123",
  "visitor_id": "vis_xyz789",
  "route": "/pricing",
  "payload": {
    "url": "https://example.com/pricing",
    "title": "Pricing Plans",
    "referrer": "https://google.com"
  }
}
```
**Response:** `202 Accepted`

---

### POST `/v1/events/batch`
Primary high-performance ingestion endpoint. Transmits up to 100 buffered events per request.

**Body:**
```json
{
  "site_key": "pk_live_xxxxxx",
  "events": [
    {
      "event_type": "network_request",
      "timestamp": "2026-08-15T21:00:01.000Z",
      "route": "/api/users/:id",
      "metadata": {
        "method": "GET",
        "url": "/api/users/123",
        "normalized_path": "/api/users/:id",
        "status_code": 200,
        "duration_ms": 45,
        "is_success": true
      }
    }
  ]
}
```
**Response:** `202 Accepted`
```json
{
  "message": "Accepted",
  "count": 1
}
```

---

### POST `/v1/heartbeat`
Lightweight session keep-alive ping emitted periodically or on page visibility change.

**Body:**
```json
{
  "site_key": "pk_live_xxxxxx",
  "session_id": "sess_abc123",
  "visitor_id": "vis_xyz789",
  "timestamp": "2026-08-15T21:00:30.000Z"
}
```
**Response:** `200 OK`

---

### GET `/sdk.js`
Serves the minified, IIFE-bundled browser SDK script.

---

## 2. Authentication API

### POST `/api/auth/register`
Creates a user, organization, and owner membership.

**Body:**
```json
{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "password": "Password123!"
}
```
**Response:** `201 Created`
```json
{
  "token": "eyJhbGci...",
  "user": { "id": "...", "email": "jane@example.com", "name": "Jane Doe" }
}
```

---

### POST `/api/auth/login`
Authenticates a user and returns a signed JWT.

**Body:**
```json
{
  "email": "jane@example.com",
  "password": "Password123!"
}
```

---

### GET `/api/auth/me`
Retrieves current user identity, organization memberships, and active projects.

---

## 3. Site Management API

- `GET /api/sites` — List all sites accessible to the current user.
- `POST /api/sites` — Create a new monitored site and auto-generate its public ingestion key.
- `GET /api/sites/:id` — Retrieve site configuration, SDK detection status, and keys.
- `PUT /api/sites/:id` — Update site domain, settings, and retention policies.
- `DELETE /api/sites/:id` — Delete a site and all associated telemetry.
- `GET /api/sites/:id/overview` — High-level KPI summary (health score, active visitors, event totals).

---

## 4. Observability & Dashboard Analytics API

### GET `/api/sites/:id/traffic`
Query params: `range=1h|24h|7d|30d`, `from=ISO`, `to=ISO`
Returns:
- Total visitors, unique visitors, total sessions
- Page views, pages/session, average session duration (seconds)
- Bounce rate
- Top pages & top referrers
- Device, browser, and operating system distributions
- Time-series traffic data for charts

### GET `/api/sites/:id/sessions`
Paginated session explorer with device, duration, entry page, and bounce indicators.

### GET `/api/sites/:id/sessions/:sessionId`
Chronological session replay timeline containing all page views, network calls, and errors for a specific session.

### GET `/api/sites/:id/errors`
Grouped list of JavaScript and runtime errors deduplicated by FNV-1a fingerprint with occurrence count and session impact.

### GET `/api/sites/:id/errors/:fingerprint`
Detailed stack trace occurrences, browser breakdown, and occurrence timeline for a specific error fingerprint.

### GET `/api/sites/:id/apis`
Inventory of all automatically discovered API endpoints with p50/p95/p99 latency metrics, error rates, and status code distributions.

### GET `/api/sites/:id/performance`
Core Web Vitals percentiles (LCP, CLS, INP, FCP, TTFB) with standard performance rating classifications.

### GET `/api/sites/:id/anomalies`
List of detected statistical anomalies with overall severity (`NORMAL`, `WARNING`, `CRITICAL`), anomaly score (0–1.0), and deterministic explanations.

### GET `/api/sites/:id/health`
Composite website health score (0–100) combining performance, reliability, API stability, and frontend error rate.

### GET `/api/sites/:id/realtime`
Real-time snapshot containing active visitors (last 5 minutes), request rate, error rate, and active incidents.

### GET `/api/sites/:id/stream` (SSE)
Server-Sent Events endpoint streaming live telemetry events and metrics directly to connected dashboards.
