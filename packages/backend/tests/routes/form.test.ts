import { describe, it, expect, beforeAll, afterAll } from 'vitest';
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

describe('GET /api/form/config', () => {
  it('returns sections with questions', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/form/config' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.sections).toBeInstanceOf(Array);
    expect(body.sections.length).toBeGreaterThan(0);
    expect(body.sections[0].questions).toBeInstanceOf(Array);
  });

  it('returns sections in order', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/form/config' });
    const sections = res.json().sections;
    for (let i = 1; i < sections.length; i++) {
      expect(sections[i].order).toBeGreaterThanOrEqual(sections[i - 1].order);
    }
  });
});

describe('POST /api/form/submit', () => {
  it('returns 400 with empty answers', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/form/submit',
      payload: { applicationType: ['materialy'], entityType: 'fizyczna', answers: [] },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().details).toBeDefined();
  });

  it('returns 400 with missing applicationType', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/form/submit',
      payload: { applicationType: [], entityType: 'fizyczna', answers: [] },
    });
    expect(res.statusCode).toBe(400);
  });

  it('returns 400 with invalid entityType', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/form/submit',
      payload: { applicationType: ['materialy'], entityType: 'invalid', answers: [] },
    });
    expect(res.statusCode).toBe(400);
  });

  it('creates submission with valid data', async () => {
    // Get form config to know question IDs
    const configRes = await app.inject({ method: 'GET', url: '/api/form/config' });
    const sections = configRes.json().sections;

    // Build answers for materialy + fizyczna path
    const answers: { questionId: number; value: string }[] = [];
    const allQuestions = sections.flatMap((s: { questions: Array<{ id: number; fieldKey: string; showWhen: Record<string, unknown> | null; type: string; isConsent: boolean }> }) => s.questions);

    for (const q of allQuestions) {
      if (q.fieldKey === 'applicationType' || q.fieldKey === 'entityType') continue;

      // Check showWhen — only answer visible questions for materialy+fizyczna
      const sw = q.showWhen;
      if (sw) {
        if (sw.applicationType && !(sw.applicationType as string[]).some((v: string) =>
          v.toLowerCase().includes('materiał') || v.toLowerCase().includes('material') || v === 'materialy'
        )) continue;
        if (sw.entityType && !(sw.entityType as string).toLowerCase().includes('fizyczn')) continue;
        if (sw.multipleProducts) continue; // skip multiple products field
      }

      let value = '';
      if (q.type === 'EMAIL') value = 'test@example.com';
      else if (q.type === 'PHONE') value = '+48 123 456 789';
      else if (q.type === 'CHECKBOX_CONSENT') value = 'true';
      else if (q.fieldKey === 'istqbProducts') value = JSON.stringify(['CTFL v4.0']);
      else if (q.type === 'SELECT') value = 'polski';
      else if (q.type === 'RADIO') value = (q as unknown as { options: string[] }).options?.[0] || 'option';
      else if (q.type === 'MULTI_SELECT' && q.fieldKey !== 'istqbProducts') value = JSON.stringify(['option1']);
      else value = 'Test answer';

      answers.push({ questionId: q.id, value });
    }

    const res = await app.inject({
      method: 'POST',
      url: '/api/form/submit',
      payload: {
        applicationType: ['materialy'],
        entityType: 'fizyczna',
        answers,
      },
    });

    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.id).toBeDefined();
    expect(body.confirmText).toBeDefined();
  });
});
