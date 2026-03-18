import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireRole } from '../../middleware/auth.js';

export async function adminFormRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.authenticate);

  // GET /admin/form/sections — all sections with questions
  app.get('/form/sections', {
    preHandler: [requireRole('ADMIN')],
  }, async () => {
    const sections = await app.prisma.section.findMany({
      orderBy: { order: 'asc' },
      include: {
        questions: { orderBy: { order: 'asc' } },
      },
    });
    return { sections };
  });

  // PUT /admin/form/sections/:id
  app.put('/form/sections/:id', {
    preHandler: [requireRole('ADMIN')],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = z.object({
      title: z.string().optional(),
      description: z.string().nullable().optional(),
      order: z.number().optional(),
    }).safeParse(request.body);

    if (!body.success) {
      return reply.status(400).send({ error: 'VALIDATION_ERROR', message: 'Błąd walidacji' });
    }

    const section = await app.prisma.section.update({
      where: { id: parseInt(id) },
      data: body.data,
    });
    return section;
  });

  // POST /admin/form/sections/:sectionId/questions
  app.post('/form/sections/:sectionId/questions', {
    preHandler: [requireRole('ADMIN')],
  }, async (request, reply) => {
    const { sectionId } = request.params as { sectionId: string };
    const body = z.object({
      fieldKey: z.string().min(1),
      label: z.string().min(1),
      helpText: z.string().nullable().optional(),
      type: z.enum(['TEXT', 'TEXTAREA', 'EMAIL', 'PHONE', 'SELECT', 'MULTI_SELECT', 'RADIO', 'CHECKBOX', 'CHECKBOX_CONSENT']),
      required: z.boolean().optional(),
      options: z.any().optional(),
      order: z.number(),
      isConsent: z.boolean().optional(),
      consentText: z.string().nullable().optional(),
      showWhen: z.any().optional(),
    }).safeParse(request.body);

    if (!body.success) {
      return reply.status(400).send({ error: 'VALIDATION_ERROR', message: 'Błąd walidacji', details: body.error.flatten().fieldErrors });
    }

    const question = await app.prisma.question.create({
      data: { sectionId: parseInt(sectionId), ...body.data },
    });
    return reply.status(201).send(question);
  });

  // PUT /admin/form/questions/:id
  app.put('/form/questions/:id', {
    preHandler: [requireRole('ADMIN')],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = z.object({
      label: z.string().optional(),
      helpText: z.string().nullable().optional(),
      type: z.enum(['TEXT', 'TEXTAREA', 'EMAIL', 'PHONE', 'SELECT', 'MULTI_SELECT', 'RADIO', 'CHECKBOX', 'CHECKBOX_CONSENT']).optional(),
      required: z.boolean().optional(),
      options: z.any().optional(),
      order: z.number().optional(),
      isConsent: z.boolean().optional(),
      consentText: z.string().nullable().optional(),
      enabled: z.boolean().optional(),
      showWhen: z.any().optional(),
    }).safeParse(request.body);

    if (!body.success) {
      return reply.status(400).send({ error: 'VALIDATION_ERROR', message: 'Błąd walidacji' });
    }

    const question = await app.prisma.question.update({
      where: { id: parseInt(id) },
      data: body.data,
    });
    return question;
  });

  // DELETE /admin/form/questions/:id
  app.delete('/form/questions/:id', {
    preHandler: [requireRole('ADMIN')],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    await app.prisma.question.delete({ where: { id: parseInt(id) } });
    return reply.status(204).send();
  });

  // PUT /admin/form/questions/reorder
  app.put('/form/questions/reorder', {
    preHandler: [requireRole('ADMIN')],
  }, async (request, reply) => {
    const body = z.object({
      orders: z.array(z.object({ id: z.number(), order: z.number() })),
    }).safeParse(request.body);

    if (!body.success) {
      return reply.status(400).send({ error: 'VALIDATION_ERROR', message: 'Błąd walidacji' });
    }

    await app.prisma.$transaction(
      body.data.orders.map((o) =>
        app.prisma.question.update({ where: { id: o.id }, data: { order: o.order } })
      )
    );

    return { success: true };
  });

  // GET /admin/form/consents
  app.get('/form/consents', {
    preHandler: [requireRole('ADMIN')],
  }, async () => {
    const consents = await app.prisma.question.findMany({
      where: { isConsent: true },
      orderBy: { order: 'asc' },
      include: { section: { select: { id: true, slug: true, title: true } } },
    });
    return { consents };
  });
}
