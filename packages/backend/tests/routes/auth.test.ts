import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { buildApp } from '../../src/server.js';
import { PrismaClient } from '@prisma/client';
import type { FastifyInstance } from 'fastify';

let app: FastifyInstance;
const prisma = new PrismaClient();

beforeAll(async () => {
  app = await buildApp({ logger: false });
});

afterAll(async () => {
  await prisma.$disconnect();
  await app.close();
});

beforeEach(async () => {
  await prisma.note.deleteMany();
  await prisma.user.deleteMany();
  // Create admin via setup
  await app.inject({
    method: 'POST',
    url: '/api/setup',
    payload: { email: 'admin@test.pl', password: 'Test123!', name: 'Admin' },
  });
});

describe('POST /api/auth/login', () => {
  it('returns token with valid credentials', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'admin@test.pl', password: 'Test123!' },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.token).toBeDefined();
    expect(body.user.email).toBe('admin@test.pl');
    expect(body.user.role).toBe('ADMIN');
  });

  it('returns 401 with invalid password', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'admin@test.pl', password: 'wrong' },
    });
    expect(res.statusCode).toBe(401);
  });

  it('returns 401 with non-existent email', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'nobody@test.pl', password: 'Test123!' },
    });
    expect(res.statusCode).toBe(401);
  });
});

describe('GET /api/auth/me', () => {
  it('returns user info with valid token', async () => {
    const login = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'admin@test.pl', password: 'Test123!' },
    });
    const token = login.json().token;

    const res = await app.inject({
      method: 'GET',
      url: '/api/auth/me',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().user.email).toBe('admin@test.pl');
  });

  it('returns 401 without token', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/auth/me' });
    expect(res.statusCode).toBe(401);
  });
});
