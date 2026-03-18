import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import './types-import.js';

export function authMiddleware(app: FastifyInstance) {
  return async function authenticate(request: FastifyRequest, reply: FastifyReply) {
    try {
      const decoded = await request.jwtVerify<{
        id: number;
        email: string;
        name: string;
        role: string;
      }>();
      request.user = decoded;
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
