import { FastifyInstance } from 'fastify';
import bcrypt from 'bcrypt';
import { z } from 'zod';
import { requireRole } from '../../middleware/auth.js';

export async function adminUserRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.authenticate);
  app.addHook('preHandler', requireRole('ADMIN'));

  // GET /admin/users
  app.get('/users', async () => {
    const users = await app.prisma.user.findMany({
      select: { id: true, email: true, name: true, role: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });
    return { users };
  });

  // POST /admin/users
  app.post('/users', async (request, reply) => {
    const body = z.object({
      email: z.string().email('Nieprawidłowy email'),
      password: z.string().min(6, 'Hasło min. 6 znaków'),
      name: z.string().min(1, 'Imię jest wymagane'),
      role: z.enum(['ADMIN', 'OPERATOR']),
    }).safeParse(request.body);

    if (!body.success) {
      return reply.status(400).send({
        error: 'VALIDATION_ERROR',
        message: 'Błąd walidacji',
        details: body.error.flatten().fieldErrors,
      });
    }

    const existing = await app.prisma.user.findUnique({ where: { email: body.data.email } });
    if (existing) {
      return reply.status(400).send({ error: 'DUPLICATE', message: 'Użytkownik z tym emailem już istnieje' });
    }

    const hashedPassword = await bcrypt.hash(body.data.password, 12);
    const user = await app.prisma.user.create({
      data: { ...body.data, password: hashedPassword },
      select: { id: true, email: true, name: true, role: true, createdAt: true },
    });

    return reply.status(201).send(user);
  });

  // PUT /admin/users/:id
  app.put('/users/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = z.object({
      email: z.string().email().optional(),
      password: z.string().min(6).optional(),
      name: z.string().min(1).optional(),
      role: z.enum(['ADMIN', 'OPERATOR']).optional(),
    }).safeParse(request.body);

    if (!body.success) {
      return reply.status(400).send({ error: 'VALIDATION_ERROR', message: 'Błąd walidacji' });
    }

    const data: Record<string, unknown> = { ...body.data };
    if (data.password) {
      data.password = await bcrypt.hash(data.password as string, 12);
    } else {
      delete data.password;
    }

    const user = await app.prisma.user.update({
      where: { id: parseInt(id) },
      data,
      select: { id: true, email: true, name: true, role: true, createdAt: true },
    });

    return user;
  });

  // DELETE /admin/users/:id
  app.delete('/users/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = parseInt(id);

    // Cannot delete self
    if (request.user!.id === userId) {
      return reply.status(400).send({ error: 'FORBIDDEN', message: 'Nie można usunąć własnego konta' });
    }

    // Cannot delete last admin
    const target = await app.prisma.user.findUnique({ where: { id: userId } });
    if (target?.role === 'ADMIN') {
      const adminCount = await app.prisma.user.count({ where: { role: 'ADMIN' } });
      if (adminCount <= 1) {
        return reply.status(400).send({ error: 'FORBIDDEN', message: 'Nie można usunąć ostatniego administratora' });
      }
    }

    await app.prisma.user.delete({ where: { id: userId } });
    return reply.status(204).send();
  });
}
