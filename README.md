# Adaptive Web Observability (AWO)

> Production-grade, multi-tenant SaaS platform for automated website telemetry, traffic analytics, frontend error monitoring, API discovery, Core Web Vitals, and adaptive statistical anomaly detection.

---

## 🌟 Key Features

- **Single-Script Installation**: Zero-dependency browser SDK (~8KB gzipped) auto-initializes via `data-site-key`.
- **Zero Mock Analytics**: Every dashboard chart and metric is derived directly from telemetry processed through the ingestion pipeline.
- **Adaptive Anomaly Detection**: Unsupervised statistical baseline engine (EWMA, Z-Score, rate-of-change, multi-signal scoring) that detects traffic surges, latency degradation, and error spikes without relying on an LLM for core math.
- **Deterministic Anomaly Explanations**: Plain-English incident summaries derived directly from telemetry variance.
- **Automatic API Discovery**: Discovers endpoints, normalizes dynamic routes (`/api/users/:id`), and tracks p50/p95/p99 latencies and error rates.
- **Frontend Error Deduplication**: Real-time stack trace capture, unhandled promise rejection tracking, and FNV-1a fingerprint grouping.
- **Core Web Vitals**: Automatic collection and rating of LCP, CLS, INP, FCP, and TTFB.
- **Privacy by Design**: Never captures passwords, form fields, cookies, authorization tokens, or arbitrary keystrokes. Supports `data-monitor-mask` and `data-monitor-ignore`.
- **OpenTelemetry-Compatible Node.js SDK**: Server-side tracing with W3C `traceparent` propagation and Express/Fastify middleware.
- **Real-Time Streaming**: Server-Sent Events (SSE) stream active visitors, request rates, error rates, and live anomalies.

---

## 🏗️ Architecture

```
[ Customer Website ] ──────> [ Browser SDK (~8KB) ]
                                    │
                             HTTPS (batch/sendBeacon)
                                    ▼
[ Ingestion API (Fastify) ] ───> [ Rate Limiting & Auth ] ───> [ Memory / Kafka Queue ]
                                                                      │
                                                                      ▼
                                                            [ Telemetry Worker ]
                                                                      │
            ┌───────────────────────────┬─────────────────────────────┤
            ▼                           ▼                             ▼
    [ PostgreSQL / Supabase ]   [ Adaptive Baseline Engine ]    [ Real-Time SSE Stream ]
    (Partitions + Retention)    (EWMA & Multi-Signal Scoring)        │
            ▲                                                        ▼
            └─────────────────────────────────────────────── [ React Dashboard ]
```

---

## 🚀 Quick Start (Local Development)

### 1. Prerequisites
- Node.js >= 20
- Supabase Project URL and Service Role Key (already pre-configured in `.env`)

### 2. Install Dependencies
```bash
npm install
```

### 3. Build Packages
```bash
npm run build:sdk
```

### 4. Seed Telemetry Data (Zero-Mock Setup)
Populates realistic traffic, sessions, API calls, JS errors, and baselines into your database:
```bash
npx tsx scripts/seed-telemetry.ts
```

### 5. Simulate an Anomaly Incident
Evaluates deviations against baselines and records an incident with explanation:
```bash
npx tsx scripts/generate-anomaly.ts
```

### 6. Run the End-to-End Integration Tests
```bash
npm run test:integration
```

### 7. Start the Platform
```bash
# Start Fastify API (port 3001) and React Dashboard (port 5173 / 3000)
npm run dev
```

- **Dashboard UI**: `http://localhost:5173`
- **Backend API**: `http://localhost:3001`
- **Customer SDK script**: `http://localhost:3001/sdk.js`
- **Interactive Test Harness**: Open `demo/index.html` in your browser!

---

## 📦 Monorepo Structure

```
adaptive-web-observability/
├── apps/
│   ├── api/             # Fastify telemetry ingestion & dashboard REST API
│   ├── dashboard/       # React 18 + TypeScript + Vite + Tailwind CSS dashboard
│   └── worker/          # Background worker (aggregation, baselines, anomaly detection)
├── packages/
│   ├── browser-sdk/     # Zero-dependency vanilla JS/TS client SDK (~8KB gzipped)
│   ├── node-sdk/        # OpenTelemetry-compatible Node.js server SDK
│   ├── anomaly-engine/  # Statistical baseline & multi-signal anomaly engine
│   ├── analytics-engine/# Event storage & queue abstraction (Postgres / ClickHouse)
│   └── shared/          # Shared TypeScript models, event schemas, & constants
├── demo/
│   └── index.html       # Customer website telemetry test harness
├── scripts/
│   ├── seed-telemetry.ts   # Realistic telemetry generator
│   └── generate-anomaly.ts # Anomaly detector incident simulation
├── tests/
│   └── integration/     # End-to-end test runner
├── docker-compose.yml   # Production container orchestration
└── docs/                # Comprehensive engineering documentation
```

---

## 📖 Documentation Index

- [API Reference](docs/api-reference.md)
- [Database Schema & Migrations](docs/database-schema.md)
- [Browser & Node SDK Guide](docs/sdk-guide.md)
- [Security & Privacy Model](docs/security-and-privacy.md)
- [Scaling Strategy & Limitations](docs/scaling-and-limitations.md)
- [Production Deployment](docs/production-deployment.md)
