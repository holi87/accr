import { FastifyInstance } from 'fastify';
import bcrypt from 'bcrypt';
import { z } from 'zod';

const setupSchema = z.object({
  email: z.string().email('Nieprawidłowy format adresu e-mail'),
  password: z.string().min(6, 'Hasło musi mieć co najmniej 6 znaków'),
  name: z.string().min(1, 'Imię jest wymagane'),
});

export async function setupRoutes(app: FastifyInstance) {
  app.get('/setup/status', async () => {
    const count = await app.prisma.user.count();
    return { setupRequired: count === 0 };
  });

  app.post('/setup', async (request, reply) => {
    const count = await app.prisma.user.count();
    if (count > 0) {
      return reply.status(403).send({
        error: 'SETUP_LOCKED',
        message: 'Setup już został wykonany',
      });
    }

    const parsed = setupSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: 'VALIDATION_ERROR',
        message: 'Błąd walidacji',
        details: parsed.error.flatten().fieldErrors,
      });
    }

    const { email, password, name } = parsed.data;
    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await app.prisma.user.create({
      data: { email, password: hashedPassword, name, role: 'ADMIN' },
    });

    return reply.status(201).send({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    });
  });
}
