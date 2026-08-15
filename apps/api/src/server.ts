import Fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import jwt from '@fastify/jwt';
import cookie from '@fastify/cookie';
import * as dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env before importing routes
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config();

import { authRoutes } from './routes/auth.js';
import { siteRoutes } from './routes/sites.js';
import { apiKeyRoutes } from './routes/api-keys.js';
import { ingestionRoutes } from './routes/ingestion.js';
import { dashboardRoutes } from './routes/dashboard.js';
import { alertRoutes } from './routes/alerts.js';
import { healthRoutes } from './routes/health.js';
import { sseRoutes } from './routes/sse.js';

import './services/event-processor.js';
import './services/session-manager.js';

const server = Fastify({
  logger: process.env.NODE_ENV === 'test' ? false : true,
});

const PORT = parseInt(process.env.API_PORT || '3001', 10);

async function start() {
  try {
    await server.register(cors, {
      origin: true, // Allow all origins for ingestion and SDK fetching
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Site-Key', 'traceparent', 'x-trace-id'],
      exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset', 'traceparent', 'x-trace-id'],
    });

    await server.register(rateLimit, {
      max: 1000,
      timeWindow: '1 minute',
    });

    await server.register(jwt, {
      secret: process.env.JWT_SECRET || 'awo-super-secret-jwt-key-minimum-32-chars',
    });

    await server.register(cookie);

    // Serve SDK JS file dynamically or from dist
    const serveSdk = async (_request: any, reply: any) => {
      const sdkDistPath = path.resolve(__dirname, '../../../packages/browser-sdk/dist/awo-sdk.js');
      let code = '';
      if (fs.existsSync(sdkDistPath)) {
        code = fs.readFileSync(sdkDistPath, 'utf8');
      } else {
        // Fallback lightweight loader script
        code = `
(function(){
  window.AWO=window.AWO||{
    init:function(c){console.log('[AWO SDK] Initialized',c);},
    trackEvent:function(n,d){console.log('[AWO Event]',n,d);},
    identify:function(t){},
    optOut:function(){},
    optIn:function(){}
  };
})();`;
      }

      reply
        .header('Content-Type', 'application/javascript; charset=utf-8')
        .header('Cache-Control', 'public, max-age=300')
        .send(code);
    };

    server.get('/sdk.js', serveSdk);
    server.get('/v1/sdk.js', serveSdk);

    // Register Routes
    await server.register(healthRoutes);
    await server.register(authRoutes);
    await server.register(siteRoutes);
    await server.register(apiKeyRoutes);
    await server.register(ingestionRoutes);
    await server.register(dashboardRoutes);
    await server.register(alertRoutes);
    await server.register(sseRoutes);

    await server.listen({ port: PORT, host: '0.0.0.0' });
    console.log(`[AWO API] Server listening on http://localhost:${PORT}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
}

// Graceful Shutdown
const listeners = ['SIGINT', 'SIGTERM'];
listeners.forEach((signal) => {
  process.on(signal, async () => {
    console.log(`Received ${signal}, shutting down...`);
    await server.close();
    process.exit(0);
  });
});

start();
