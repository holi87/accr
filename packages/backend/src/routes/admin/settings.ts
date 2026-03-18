import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireRole } from '../../middleware/auth.js';
import fs from 'fs';
import path from 'path';

export async function adminSettingsRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.authenticate);

  // GET /admin/settings
  app.get('/settings', {
    preHandler: [requireRole('ADMIN')],
  }, async () => {
    const settings = await app.prisma.setting.findMany();
    const map: Record<string, string> = {};
    for (const s of settings) map[s.key] = s.value;
    return { settings: map };
  });

  // PUT /admin/settings/:key
  app.put('/settings/:key', {
    preHandler: [requireRole('ADMIN')],
  }, async (request, reply) => {
    const { key } = request.params as { key: string };
    const body = z.object({ value: z.string() }).safeParse(request.body);

    if (!body.success) {
      return reply.status(400).send({ error: 'VALIDATION_ERROR', message: 'Wartość jest wymagana' });
    }

    const setting = await app.prisma.setting.upsert({
      where: { key },
      update: { value: body.data.value },
      create: { key, value: body.data.value },
    });

    return setting;
  });

  // POST /admin/settings/logo — upload logo
  app.post('/settings/logo', {
    preHandler: [requireRole('ADMIN')],
  }, async (request, reply) => {
    const data = await request.file();
    if (!data) {
      return reply.status(400).send({ error: 'VALIDATION_ERROR', message: 'Plik jest wymagany' });
    }

    const ext = path.extname(data.filename).toLowerCase();
    if (!['.png', '.jpg', '.jpeg', '.svg'].includes(ext)) {
      return reply.status(400).send({ error: 'VALIDATION_ERROR', message: 'Dozwolone formaty: PNG, JPG, SVG' });
    }

    const uploadDir = process.env.UPLOAD_DIR || './uploads';
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

    const filename = `logo${ext}`;
    const filepath = path.join(uploadDir, filename);
    const buffer = await data.toBuffer();
    fs.writeFileSync(filepath, buffer);

    await app.prisma.setting.upsert({
      where: { key: 'logo_path' },
      update: { value: filepath },
      create: { key: 'logo_path', value: filepath },
    });

    return { path: `/uploads/${filename}` };
  });

  // GET /settings/logo (public)
  app.get('/settings/logo', async (_request, reply) => {
    const setting = await app.prisma.setting.findUnique({ where: { key: 'logo_path' } });
    if (!setting || !fs.existsSync(setting.value)) {
      return reply.status(404).send({ error: 'NOT_FOUND', message: 'Logo nie znalezione' });
    }
    const ext = path.extname(setting.value).slice(1).toLowerCase();
    const mime = ext === 'svg' ? 'image/svg+xml' : ext === 'png' ? 'image/png' : 'image/jpeg';
    const fileBuffer = fs.readFileSync(setting.value);
    return reply.type(mime).send(fileBuffer);
  });

  // POST /admin/settings/test-email
  app.post('/settings/test-email', {
    preHandler: [requireRole('ADMIN')],
  }, async (request, reply) => {
    const body = z.object({ to: z.string().email() }).safeParse(request.body);

    if (!body.success) {
      return reply.status(400).send({ error: 'VALIDATION_ERROR', message: 'Nieprawidłowy adres email' });
    }

    // TODO: implement actual Gmail API sending
    // For now, just log it
    const emailLog = await app.prisma.emailLog.create({
      data: {
        toAddress: body.data.to,
        subject: 'Test email z portalu SJSI',
        body: 'To jest testowa wiadomość z portalu akredytacji SJSI.',
        status: 'sent',
      },
    });

    return { success: true, emailLog };
  });
}
