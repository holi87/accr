import './types.js';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import multipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { healthRoutes } from './routes/health.js';
import { setupRoutes } from './routes/setup.js';
import { authRoutes } from './routes/auth.js';
import { formRoutes } from './routes/form.js';
import { adminSubmissionRoutes } from './routes/admin/submissions.js';
import { adminFormRoutes } from './routes/admin/form.js';
import { adminSettingsRoutes } from './routes/admin/settings.js';
import { adminUserRoutes } from './routes/admin/users.js';
import { authMiddleware } from './middleware/auth.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function buildApp(opts?: { logger?: boolean }) {
  const prisma = new PrismaClient();
  await prisma.$connect();

  const app = Fastify({
    logger: opts?.logger ?? process.env.NODE_ENV !== 'test',
  });

  // Plugins
  await app.register(cors, { origin: true, credentials: true });
  await app.register(jwt, {
    secret: process.env.SESSION_SECRET || 'dev-secret-change-me',
  });
  await app.register(multipart, { limits: { fileSize: 2 * 1024 * 1024 } });

  // Decorate with prisma
  app.decorate('prisma', prisma);

  // Auth decorator
  app.decorate('authenticate', authMiddleware(app));

  // API routes
  await app.register(healthRoutes, { prefix: '/api' });
  await app.register(setupRoutes, { prefix: '/api' });
  await app.register(authRoutes, { prefix: '/api' });
  await app.register(formRoutes, { prefix: '/api' });
  await app.register(adminSubmissionRoutes, { prefix: '/api/admin' });
  await app.register(adminFormRoutes, { prefix: '/api/admin' });
  await app.register(adminSettingsRoutes, { prefix: '/api/admin' });
  await app.register(adminUserRoutes, { prefix: '/api/admin' });

  // Serve uploaded files
  const uploadDir = process.env.UPLOAD_DIR || './uploads';
  await app.register(fastifyStatic, {
    root: path.resolve(uploadDir),
    prefix: '/uploads/',
  });

  // In production, serve frontend SPA
  if (process.env.NODE_ENV === 'production') {
    const publicDir = path.resolve(__dirname, '../public');
    const indexHtml = fs.readFileSync(path.join(publicDir, 'index.html'));

    // Serve static assets (js, css, images)
    app.get('/assets/*', (request, reply) => {
      const filePath = path.join(publicDir, request.url);
      if (fs.existsSync(filePath)) {
        const ext = path.extname(filePath).slice(1);
        const mimeTypes: Record<string, string> = {
          js: 'application/javascript',
          css: 'text/css',
          png: 'image/png',
          jpg: 'image/jpeg',
          svg: 'image/svg+xml',
          ico: 'image/x-icon',
          woff: 'font/woff',
          woff2: 'font/woff2',
        };
        return reply.type(mimeTypes[ext] || 'application/octet-stream').send(fs.readFileSync(filePath));
      }
      return reply.status(404).send({ error: 'NOT_FOUND' });
    });

    // SPA fallback — all non-API, non-asset routes serve index.html
    app.setNotFoundHandler((request, reply) => {
      // Don't intercept API routes
      if (request.url.startsWith('/api/')) {
        return reply.status(404).send({ error: 'NOT_FOUND', message: 'Endpoint nie znaleziony' });
      }
      return reply.type('text/html').send(indexHtml);
    });
  }

  // Cleanup on close
  app.addHook('onClose', async () => {
    await prisma.$disconnect();
  });

  return app;
}

// Start server if run directly
const isMainModule = process.argv[1]?.includes('server');
if (isMainModule) {
  const app = await buildApp({ logger: true });
  const port = parseInt(process.env.PORT || '3000', 10);
  try {
    await app.listen({ port, host: '0.0.0.0' });
    console.log(`Server running on http://localhost:${port}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}
