import './types.js';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import multipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';
import { PrismaClient } from '@prisma/client';
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
    decorateReply: false,
  });

  // In production, serve frontend SPA
  if (process.env.NODE_ENV === 'production') {
    const publicDir = path.resolve(__dirname, '../public');
    await app.register(fastifyStatic, {
      root: publicDir,
      prefix: '/',
      decorateReply: false,
    });
    app.setNotFoundHandler((_req, reply) => {
      reply.sendFile('index.html', publicDir);
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
