import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { buildApp } from '../../src/server.js';
import { PrismaClient } from '@prisma/client';
import type { FastifyInstance } from 'fastify';

let app: FastifyInstance;
const prisma = new PrismaClient();
let adminToken: string;

async function getAdminToken(): Promise<string> {
  const login = await app.inject({
    method: 'POST',
    url: '/api/auth/login',
    payload: { email: 'admin@test.pl', password: 'Test123!' },
  });
  return login.json().token;
}

beforeAll(async () => {
  app = await buildApp({ logger: false });
});

afterAll(async () => {
  await prisma.$disconnect();
  await app.close();
});

beforeEach(async () => {
  // Clean and recreate admin
  await prisma.emailLog.deleteMany();
  await prisma.note.deleteMany();
  await prisma.answer.deleteMany();
  await prisma.submission.deleteMany();
  await prisma.user.deleteMany();

  await app.inject({
    method: 'POST',
    url: '/api/setup',
    payload: { email: 'admin@test.pl', password: 'Test123!', name: 'Admin' },
  });
  adminToken = await getAdminToken();
});

describe('Admin auth enforcement', () => {
  it('rejects unauthenticated requests to /admin/submissions', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/admin/submissions' });
    expect(res.statusCode).toBe(401);
  });

  it('rejects unauthenticated requests to /admin/settings', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/admin/settings' });
    expect(res.statusCode).toBe(401);
  });

  it('rejects unauthenticated requests to /admin/users', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/admin/users' });
    expect(res.statusCode).toBe(401);
  });
});

describe('GET /api/admin/submissions', () => {
  it('returns paginated list', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/admin/submissions',
      headers: { authorization: `Bearer ${adminToken}` },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.submissions).toBeInstanceOf(Array);
    expect(body.pagination).toBeDefined();
    expect(body.pagination.page).toBe(1);
  });
});

describe('GET /api/admin/submissions/stats', () => {
  it('returns stats', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/admin/submissions/stats',
      headers: { authorization: `Bearer ${adminToken}` },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.total).toBeDefined();
    expect(body.byStatus).toBeDefined();
    expect(body.byStatus.NOWE).toBeDefined();
  });
});

describe('Admin form sections (ADMIN only)', () => {
  it('allows ADMIN to get form sections', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/admin/form/sections',
      headers: { authorization: `Bearer ${adminToken}` },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().sections).toBeInstanceOf(Array);
  });

  it('rejects OPERATOR from form sections', async () => {
    // Create an operator user
    await app.inject({
      method: 'POST',
      url: '/api/admin/users',
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { email: 'op@test.pl', password: 'Test123!', name: 'Operator', role: 'OPERATOR' },
    });

    const opLogin = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'op@test.pl', password: 'Test123!' },
    });
    const opToken = opLogin.json().token;

    const res = await app.inject({
      method: 'GET',
      url: '/api/admin/form/sections',
      headers: { authorization: `Bearer ${opToken}` },
    });
    expect(res.statusCode).toBe(403);
  });
});

describe('GET /api/admin/settings', () => {
  it('returns settings for ADMIN', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/admin/settings',
      headers: { authorization: `Bearer ${adminToken}` },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().settings).toBeDefined();
  });
});

describe('Admin users CRUD', () => {
  it('lists users', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/admin/users',
      headers: { authorization: `Bearer ${adminToken}` },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().users).toBeInstanceOf(Array);
    expect(res.json().users.length).toBe(1);
  });

  it('creates a new user', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/admin/users',
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { email: 'new@test.pl', password: 'Test123!', name: 'New User', role: 'OPERATOR' },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().email).toBe('new@test.pl');
    expect(res.json().role).toBe('OPERATOR');
  });

  it('prevents deleting self', async () => {
    const me = await app.inject({
      method: 'GET',
      url: '/api/auth/me',
      headers: { authorization: `Bearer ${adminToken}` },
    });
    const myId = me.json().user.id;

    const res = await app.inject({
      method: 'DELETE',
      url: `/api/admin/users/${myId}`,
      headers: { authorization: `Bearer ${adminToken}` },
    });
    expect(res.statusCode).toBe(400);
  });
});
