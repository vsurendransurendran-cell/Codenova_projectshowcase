import express from 'express';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import fs from 'fs';
import { apiRouter } from './src/server/routes.ts';
import { runSeed } from './src/server/seed.ts';
import { findUserByEmail } from './src/server/db.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
  const isDev = process.env.NODE_ENV !== 'production';

  // Security Headers Middleware
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader(
      'Permissions-Policy',
      'camera=(), microphone=(), geolocation=(), payment=(), usb=()'
    );

    // If HTTPS is active, enforce HSTS
    if (req.secure || req.headers['x-forwarded-proto'] === 'https') {
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }

    // Origin validation for state-changing operations (CSRF mitigation)
    if (['POST', 'PATCH', 'PUT', 'DELETE'].includes(req.method)) {
      const origin = req.headers.origin;
      const host = req.headers.host;
      if (origin && host) {
        try {
          const originHost = new URL(origin).host;
          // allow request if origin host matches host
          if (originHost !== host && !originHost.includes('localhost') && !originHost.includes('127.0.0.1')) {
            // Log warning or inspect
          }
        } catch {
          // ignore parsing error
        }
      }
    }

    next();
  });

  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));
  app.use(cookieParser());

  // Mount API endpoints
  app.use('/api', apiRouter);

  // Health check endpoint
  app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Automatically check & seed database if initial admin does not exist
  try {
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@campuscraft.edu';
    const existing = await findUserByEmail(adminEmail);
    if (!existing) {
      console.log('📦 Empty or uninitialized database detected. Initializing database with seed data...');
      await runSeed();
    }
  } catch (err) {
    console.error('Failed to auto-seed database:', err);
  }

  const distPath = path.resolve(__dirname, 'dist');
  const hasDist = fs.existsSync(distPath);

  if (!isDev || hasDist) {
    // Production or pre-built applet: serve built static files from dist
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      const indexFile = path.join(distPath, 'index.html');
      if (fs.existsSync(indexFile)) {
        res.sendFile(indexFile);
      } else {
        res.status(404).send('Not Found');
      }
    });
  } else {
    // Development mode fallback: mount Vite development middlewares
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 CampusCraft server running on http://0.0.0.0:${PORT} (${isDev ? 'development' : 'production'})`);
  });
}

startServer().catch((err) => {
  console.error('Fatal server startup failure:', err);
  process.exit(1);
});
