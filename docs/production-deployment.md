# Production Deployment Guide

---

## 1. Environment Variables Checklist

| Variable | Description | Example / Default |
|---|---|---|
| `SUPABASE_URL` | Supabase / PostgreSQL Project URL | `https://xxxx.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Service Role Secret Key | `eyJhbGci...` |
| `API_PORT` | Port for Fastify Ingestion & REST API | `3001` |
| `JWT_SECRET` | Secret key for signing user authentication tokens | Minimum 32 characters |
| `REDIS_URL` | Redis connection URL for distributed rate-limiting & cache | `redis://localhost:6379` |
| `CORS_ORIGINS` | Permitted origins for the dashboard | `https://app.yourdomain.com` |
| `AGGREGATION_INTERVAL_MS` | Worker hourly rollup interval | `60000` (1 min) |
| `BASELINE_INTERVAL_MS` | Anomaly baseline calculation interval | `300000` (5 min) |

---

## 2. Docker Compose Deployment

To deploy the entire stack on a production VPS or cloud VM:

```bash
# 1. Clone repository
git clone <repo-url> /opt/awo
cd /opt/awo

# 2. Configure production .env
cp .env.example .env
nano .env

# 3. Build and launch containers
docker compose up -d --build

# 4. Verify running containers
docker compose ps
```

---

## 3. Database Migration Execution

Ensure the SQL migrations from `supabase_migration.md` have been executed in your Supabase SQL Editor or via standard `psql`:

```bash
# Optional direct psql execution
psql "postgres://postgres:[PASSWORD]@[HOST]:5432/postgres" -f docs/schema.sql
```

---

## 4. Health Checks & Observability

- **API Liveness Probe**: `GET http://localhost:3001/health`
- **API Readiness & DB Probe**: `GET http://localhost:3001/health/detailed`
- **Dashboard Web UI**: `http://localhost:3000`
- **Browser SDK CDN Endpoint**: `http://localhost:3001/sdk.js`
