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
  // Clean users table before each test
  await prisma.note.deleteMany();
  await prisma.user.deleteMany();
});

describe('GET /api/setup/status', () => {
  it('returns setupRequired: true when no users', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/setup/status' });
    expect(res.statusCode).toBe(200);
    expect(res.json().setupRequired).toBe(true);
  });

  it('returns setupRequired: false when users exist', async () => {
    // Create a user first
    await app.inject({
      method: 'POST',
      url: '/api/setup',
      payload: { email: 'admin@test.pl', password: 'Test123!', name: 'Admin' },
    });

    const res = await app.inject({ method: 'GET', url: '/api/setup/status' });
    expect(res.statusCode).toBe(200);
    expect(res.json().setupRequired).toBe(false);
  });
});

describe('POST /api/setup', () => {
  it('creates admin user', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/setup',
      payload: { email: 'admin@test.pl', password: 'Test123!', name: 'Admin' },
    });
    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.email).toBe('admin@test.pl');
    expect(body.role).toBe('ADMIN');
  });

  it('returns 403 if users already exist', async () => {
    await app.inject({
      method: 'POST',
      url: '/api/setup',
      payload: { email: 'admin@test.pl', password: 'Test123!', name: 'Admin' },
    });

    const res = await app.inject({
      method: 'POST',
      url: '/api/setup',
      payload: { email: 'admin2@test.pl', password: 'Test123!', name: 'Admin2' },
    });
    expect(res.statusCode).toBe(403);
  });

  it('validates required fields', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/setup',
      payload: { email: 'bad-email', password: '12', name: '' },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toBe('VALIDATION_ERROR');
  });
});
