import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import '../types.js';

export function authMiddleware(app: FastifyInstance) {
  return async function authenticate(request: FastifyRequest, reply: FastifyReply) {
    try {
      await request.jwtVerify();
    } catch {
      reply.status(401).send({ error: 'UNAUTHORIZED', message: 'Wymagane logowanie' });
    }
  };
}

export function requireRole(role: string) {
  return async function (request: FastifyRequest, reply: FastifyReply) {
    if (!request.user || request.user.role !== role) {
      reply.status(403).send({ error: 'FORBIDDEN', message: 'Brak uprawnień' });
    }
  };
}
