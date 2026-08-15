# SDK Installation & Integration Guide

Adaptive Web Observability provides lightweight client and server SDKs with zero unnecessary overhead.

---

## 1. Browser SDK (JavaScript / TypeScript)

### Installation Method A: Single Script Tag (Recommended)

Add this tag to the `<head>` of your HTML:

```html
<script
  src="https://cdn.your-domain.com/sdk.js"
  data-site-key="pk_live_YOUR_PUBLIC_KEY"
  data-endpoint="https://api.your-domain.com"
  async>
</script>
```

### Installation Method B: NPM / ES Module

```bash
npm install @awo/browser-sdk
```

```javascript
import { AWO } from '@awo/browser-sdk';

AWO.init({
  siteKey: 'pk_live_YOUR_PUBLIC_KEY',
  endpoint: 'https://api.your-domain.com',
  batchSize: 10,
  flushInterval: 5000,
  enableClickTracking: true,
  enableNetworkTracking: true,
  enableErrorTracking: true,
  enablePerformanceTracking: true,
});
```

---

### What the Browser SDK Automatically Collects

1. **Page Views & SPA Route Changes**: Intercepts `history.pushState`, `history.replaceState`, `popstate`, and `hashchange`.
2. **Network & API Activity**: Non-blocking wrapper around `window.fetch` and `XMLHttpRequest`. Automatically normalizes paths (e.g. `/api/users/456` → `/api/users/:id`). Never captures request/response bodies or sensitive headers.
3. **Frontend Errors**: Intercepts `window.onerror`, unhandled promise rejections, and resource load failures.
4. **Core Web Vitals & Performance**: Tracks LCP, CLS, INP, FCP, TTFB, and DNS/TLS connection timings using native `PerformanceObserver`.
5. **Engagement & Sessions**: Automatic sessionization with 30-minute inactivity timeout, scroll depth, and active time.

---

### Privacy & Data Masking Controls

- **Ignore Element**: Add `data-monitor-ignore` to prevent clicks or interactions on an element from being recorded:
  ```html
  <button data-monitor-ignore="true">Sensitive Internal Action</button>
  ```

- **Mask Element Text**: Add `data-monitor-mask` to replace text with `[masked]`:
  ```html
  <span data-monitor-mask="true">$1,450.00 Balance</span>
  ```

- **User Opt-Out**:
  ```javascript
  AWO.optOut(); // Disables all telemetry
  AWO.optIn();  // Re-enables telemetry
  ```

---

### Custom Event Tracking

```javascript
AWO.trackEvent('purchase_completed', {
  plan: 'enterprise',
  seats: 50
});
```

---

## 2. Node.js Server SDK

### Installation

```bash
npm install @awo/node-sdk
```

### Usage with Express

```typescript
import express from 'express';
import { monitor } from '@awo/node-sdk';

const app = express();

const awo = monitor({
  apiKey: process.env.AWO_API_KEY!,
  serviceName: 'billing-service',
  environment: 'production',
});

// Attach Express telemetry middleware (captures latencies, errors, and traces)
app.use(awo.expressMiddleware);

app.get('/api/billing', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(8080);
```

### Usage with Fastify

```typescript
import Fastify from 'fastify';
import { monitor } from '@awo/node-sdk';

const fastify = Fastify();

const awo = monitor({
  apiKey: process.env.AWO_API_KEY!,
  serviceName: 'order-service',
});

await fastify.register(awo.fastifyPlugin);
```

### Manual Error Capture

```typescript
try {
  processPayment();
} catch (err) {
  awo.captureError(err, 'PaymentProcessingError');
}
```

### OpenTelemetry Distributed Tracing

The Node.js SDK automatically parses and injects W3C `traceparent` headers (`00-traceid-spanid-flags`), enabling end-to-end tracing across distributed microservices.
