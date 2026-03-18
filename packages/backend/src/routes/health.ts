import { FastifyInstance } from 'fastify';

export async function healthRoutes(app: FastifyInstance) {
  app.get('/health', async (_request, _reply) => {
    let dbOk = false;
    try {
      await app.prisma.$queryRaw`SELECT 1`;
      dbOk = true;
    } catch {
      dbOk = false;
    }
    return {
      status: 'ok',
      db: dbOk,
      timestamp: new Date().toISOString(),
    };
  });
}
