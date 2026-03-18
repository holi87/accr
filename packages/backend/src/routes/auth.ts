import { FastifyInstance } from 'fastify';
import bcrypt from 'bcrypt';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function authRoutes(app: FastifyInstance) {
  app.post('/auth/login', async (request, reply) => {
    const parsed = loginSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: 'VALIDATION_ERROR',
        message: 'Nieprawidłowe dane logowania',
      });
    }

    const { email, password } = parsed.data;
    const user = await app.prisma.user.findUnique({ where: { email } });

    if (!user) {
      return reply.status(401).send({
        error: 'INVALID_CREDENTIALS',
        message: 'Nieprawidłowy email lub hasło',
      });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return reply.status(401).send({
        error: 'INVALID_CREDENTIALS',
        message: 'Nieprawidłowy email lub hasło',
      });
    }

    const token = app.jwt.sign(
      { id: user.id, email: user.email, name: user.name, role: user.role },
      { expiresIn: '24h' }
    );

    return {
      token,
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    };
  });

  app.get('/auth/me', {
    preHandler: [app.authenticate],
  }, async (request) => {
    return { user: request.user };
  });

  app.post('/auth/logout', {
    preHandler: [app.authenticate],
  }, async () => {
    // JWT is stateless — client discards token
    return { success: true };
  });
}
