import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireRole } from '../../middleware/auth.js';

export async function adminSubmissionRoutes(app: FastifyInstance) {
  // All routes require auth
  app.addHook('preHandler', app.authenticate);

  // GET /admin/submissions — list
  app.get('/submissions', async (request) => {
    const query = request.query as Record<string, string>;
    const page = Math.max(1, parseInt(query.page || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(query.limit || '25')));
    const skip = (page - 1) * limit;
    const sortBy = query.sortBy || 'createdAt';
    const sortDir = query.sortDir === 'asc' ? 'asc' : 'desc';

    const where: Record<string, unknown> = {};
    if (query.status) where.status = query.status;
    if (query.entityType) where.entityType = query.entityType;

    if (query.search) {
      where.OR = [
        { answers: { some: { value: { contains: query.search, mode: 'insensitive' } } } },
      ];
    }

    const [submissions, total] = await Promise.all([
      app.prisma.submission.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortDir },
        include: {
          answers: {
            include: { question: { select: { fieldKey: true, label: true } } },
          },
        },
      }),
      app.prisma.submission.count({ where }),
    ]);

    return {
      submissions,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  });

  // GET /admin/submissions/stats
  app.get('/submissions/stats', async () => {
    const [all, byStatus, recentWeek] = await Promise.all([
      app.prisma.submission.count(),
      app.prisma.submission.groupBy({ by: ['status'], _count: true }),
      app.prisma.submission.count({
        where: { createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
      }),
    ]);

    const statusMap: Record<string, number> = { NOWE: 0, W_TRAKCIE: 0, ZAAKCEPTOWANE: 0, ODRZUCONE: 0 };
    for (const s of byStatus) statusMap[s.status] = s._count;

    return { total: all, byStatus: statusMap, recentWeek };
  });

  // GET /admin/submissions/:id — detail
  app.get('/submissions/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const submission = await app.prisma.submission.findUnique({
      where: { id: parseInt(id) },
      include: {
        answers: {
          include: { question: { select: { fieldKey: true, label: true, type: true, isConsent: true, consentText: true, sectionId: true } } },
        },
        notes: {
          include: { author: { select: { id: true, name: true } } },
          orderBy: { createdAt: 'desc' },
        },
        emails: { orderBy: { sentAt: 'desc' } },
      },
    });

    if (!submission) {
      return reply.status(404).send({ error: 'NOT_FOUND', message: 'Zgłoszenie nie znalezione' });
    }

    return submission;
  });

  // PATCH /admin/submissions/:id/status
  app.patch('/submissions/:id/status', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = z.object({ status: z.enum(['NOWE', 'W_TRAKCIE', 'ZAAKCEPTOWANE', 'ODRZUCONE']) }).safeParse(request.body);

    if (!body.success) {
      return reply.status(400).send({ error: 'VALIDATION_ERROR', message: 'Nieprawidłowy status' });
    }

    const submission = await app.prisma.submission.update({
      where: { id: parseInt(id) },
      data: { status: body.data.status },
    });

    return submission;
  });

  // POST /admin/submissions/:id/notes
  app.post('/submissions/:id/notes', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = z.object({ content: z.string().min(1) }).safeParse(request.body);

    if (!body.success) {
      return reply.status(400).send({ error: 'VALIDATION_ERROR', message: 'Treść notatki jest wymagana' });
    }

    const note = await app.prisma.note.create({
      data: {
        submissionId: parseInt(id),
        authorId: request.user!.id,
        content: body.data.content,
      },
      include: { author: { select: { id: true, name: true } } },
    });

    return reply.status(201).send(note);
  });

  // POST /admin/submissions/:id/email — send email to applicant
  app.post('/submissions/:id/email', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = z.object({ subject: z.string().min(1), body: z.string().min(1) }).safeParse(request.body);

    if (!body.success) {
      return reply.status(400).send({ error: 'VALIDATION_ERROR', message: 'Temat i treść są wymagane' });
    }

    // Get submission email
    const submission = await app.prisma.submission.findUnique({
      where: { id: parseInt(id) },
      include: { answers: { include: { question: true } } },
    });

    if (!submission) {
      return reply.status(404).send({ error: 'NOT_FOUND', message: 'Zgłoszenie nie znalezione' });
    }

    const emailAnswer = submission.answers.find((a: { question: { fieldKey: string }; value: string }) => a.question.fieldKey === 'email');
    const toAddress = emailAnswer?.value || '';

    // Log email (actual sending is TODO — Gmail API integration)
    const emailLog = await app.prisma.emailLog.create({
      data: {
        submissionId: submission.id,
        toAddress,
        subject: body.data.subject,
        body: body.data.body,
        status: 'sent', // TODO: actual send
      },
    });

    return reply.status(201).send(emailLog);
  });
}
