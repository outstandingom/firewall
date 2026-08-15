# Scaling Strategy & Technical Limitations

---

## 1. High-Volume Scaling Strategy

To support millions of events per minute across thousands of web properties:

```
[ Browser SDKs ]
       │
[ API Load Balancers (Fastify Ingestion Cluster) ]
       │
[ Kafka / Redpanda / AWS Kinesis Message Streams ] (Partitioned by site_id)
       │
[ Distributed Stream Processors (Worker Cluster) ]
       │
 ┌─────┴───────────────────────┐
 ▼                             ▼
[ ClickHouse Columnar Store ] [ PostgreSQL / Supabase ]
(Raw & Aggregated Telemetry)  (Users, Orgs, Alert Rules, Config)
```

### Analytics Storage Abstraction
The `packages/analytics-engine` package exposes an abstract `EventStore` interface. While PostgreSQL with time-range partitioning serves the MVP, ClickHouse can be plugged in by implementing `ClickHouseEventStore` without modifying application routes.

### Partitioning & Automated Retention
- Tables are partitioned by month on `timestamp`.
- Background worker executes periodic partition retention drops based on each site's `retention_days` setting.

---

## 2. Known Browser Technical Limitations

1. **Ad-Blockers & Tracking Prevention**: Strict ad-blockers (e.g. uBlock Origin with custom blocklists) may block domains named `*analytics*` or `*telemetry*`.
   - *Mitigation*: The SDK supports custom proxy endpoints (`data-endpoint="/api/telemetry"`), allowing website owners to proxy traffic through their own first-party domain.
2. **Tab Discard & Mobile Backgrounding**: Browsers may terminate background tabs before pending asynchronous `fetch` calls complete.
   - *Mitigation*: The SDK hooks `visibilitychange` and `pagehide` to flush pending queues using `navigator.sendBeacon()` or `fetch` with `keepalive: true`.
3. **CORS Restrictions on Script Errors**: Unhandled errors originating from cross-origin scripts (CDNs without `crossorigin="anonymous"`) report `Script error.` with line 0 and no stack trace due to browser security restrictions.
   - *Mitigation*: Documented recommendation to add `crossorigin="anonymous"` on all CDN `<script>` tags.
4. **INP & Web Vitals Browser Support**: Older browsers or Safari versions prior to iOS 16.4 lack full `Interaction to Next Paint (INP)` or `PerformanceObserver` entry types.
   - *Mitigation*: SDK uses graceful feature-detection fallbacks (`safeExec`) and never crashes host applications.

---

## 3. Known Backend Limitations

1. **Supabase / PostgreSQL Raw Ingestion Limits**: A single PostgreSQL instance typically caps at ~10,000 writes/second. High-volume deployments must route events to Kafka/Redis streams before bulk-inserting in micro-batches (e.g., 500-1000 records per query).
2. **In-Memory Rate Limiting**: The default in-memory rate limiter is per API instance. For multi-node containerized deployments, set `REDIS_URL` in `.env` to enable cluster-wide synchronized rate limiting.
