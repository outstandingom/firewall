# GrowHaz: Adaptive Web Observability 

GrowHaz is a full-stack, monorepo-based observability platform designed to provide real-time telemetry, session tracking, performance monitoring, and anomaly detection for modern web applications. 

This platform consists of a lightweight vanilla browser SDK, a high-throughput Fastify API with Supabase backend, and a comprehensive React/Vite dashboard for visualizing metrics.

## 🏗️ Architecture

The project is structured as a Turborepo monorepo with the following packages:

- **`apps/api`**: A high-performance Node.js REST API built with Fastify. It handles ingestion of telemetry events, authenticates site SDK keys, interfaces with Supabase (PostgreSQL), and streams real-time updates via Server-Sent Events (SSE).
- **`apps/dashboard`**: A React single-page application built with Vite and Tailwind CSS. It provides visualizations for traffic, user sessions, performance metrics (Web Vitals), network request monitoring, and JavaScript errors.
- **`packages/browser-sdk`**: A lightweight (~8KB gzipped), zero-dependency vanilla TypeScript browser SDK that automatically instruments websites to capture page views, clicks, network requests, errors, and performance data.
- **`packages/shared`**: Shared TypeScript types, schemas (Zod), and utility constants used across the API, Dashboard, and SDK.

## 🚀 Key Features

1. **Real-time Telemetry Ingestion**: Track page views, SPA route changes, user sessions, and custom events.
2. **Performance Monitoring**: Automatically captures Core Web Vitals (LCP, FCP, CLS, INP) and detailed navigation timings (DNS, TCP, TLS).
3. **Error Tracking**: Global capture of unhandled JavaScript exceptions, promise rejections, and resource loading failures with automatic deduplication and stack trace recording.
4. **Network Observability**: Instruments `fetch` and `XMLHttpRequest` to track API call durations, status codes, and error rates.
5. **Secure Authentication**: Native Supabase Authentication integration and robust API Key generation (`pk_live_...` and `sk_live_...`) with rate limiting to secure data ingestion endpoints.
6. **Live Updates**: Real-time event streaming to the dashboard via SSE for instant visibility into active site traffic.

## 🛠️ Tech Stack

- **Frontend Dashboard**: React 18, Vite, Tailwind CSS, Recharts, Lucide React, React Router.
- **Backend API**: Node.js, Fastify, Zod (validation).
- **Database**: Supabase (PostgreSQL), configured with Row Level Security (RLS) and custom functions.
- **Browser SDK**: Vanilla TypeScript, esbuild (for IIFE & ESM bundling).
- **Tooling**: Turborepo, npm workspaces, TypeScript.

## 📦 Installation & Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/outstandingom/firewall.git
   cd firewall
   ```

2. **Install dependencies:**
   This project uses npm workspaces. Run from the root:
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   Create a `.env` file in the root based on `.env.example`:
   ```env
   VITE_SUPABASE_URL="http://localhost:54321"
   VITE_SUPABASE_ANON_KEY="your-anon-key"
   SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
   VITE_API_URL="http://localhost:3001"
   PORT="3001"
   ```

4. **Database Initialization (Supabase):**
   Ensure you have the Supabase CLI installed, or run the provided SQL migrations against your hosted Supabase instance.
   ```bash
   npm run db:setup
   # or run the SQL files located in supabase/migrations/
   ```

5. **Build Shared Packages:**
   ```bash
   npm run build -w packages/shared
   npm run build -w packages/browser-sdk
   ```

6. **Start the Development Servers:**
   Run the API and Dashboard concurrently from the root:
   ```bash
   npm run dev
   ```
   - API will be available at: `http://localhost:3001`
   - Dashboard will be available at: `http://localhost:5173`

## 📊 Integrating the SDK

Once a site is created in the dashboard, you will receive a Site ID and a Public API Key. Add the following snippet to the `<head>` of the website you wish to monitor:

```html
<!-- Growhaz Observability Tracking Code -->
<script
  src="http://localhost:3001/sdk.js"
  data-site-key="pk_live_your_public_key_here"
  data-endpoint="http://localhost:3001"
  defer
></script>
```

Alternatively, install via NPM:
```bash
npm install @awo/browser-sdk
```
```typescript
import { AWO } from '@awo/browser-sdk';

AWO.init({
  siteKey: 'pk_live_your_public_key_here',
  endpoint: 'http://localhost:3001'
});
```

## 📜 License
Private & Confidential. All rights reserved by GrowHaz.
