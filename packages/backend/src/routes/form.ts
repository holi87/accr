import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { evaluateShowWhen } from '../utils/showWhen.js';

const submitSchema = z.object({
  applicationType: z.array(z.string()).min(1, 'Wybierz co najmniej jeden rodzaj zgłoszenia'),
  entityType: z.enum(['fizyczna', 'prawna'], {
    errorMap: () => ({ message: 'Wybierz typ podmiotu' }),
  }),
  answers: z.array(
    z.object({
      questionId: z.number(),
      value: z.string(),
    })
  ),
});

export async function formRoutes(app: FastifyInstance) {
  // GET /api/form/config — public form structure
  app.get('/form/config', async () => {
    const sections = await app.prisma.section.findMany({
      orderBy: { order: 'asc' },
      include: {
        questions: {
          where: { enabled: true },
          orderBy: { order: 'asc' },
        },
      },
    });
    return { sections };
  });

  // POST /api/form/submit — submit form
  app.post('/form/submit', async (request, reply) => {
    const parsed = submitSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: 'VALIDATION_ERROR',
        message: 'Uzupełnij wymagane pola',
        details: parsed.error.flatten().fieldErrors,
      });
    }

    const { applicationType, entityType, answers } = parsed.data;

    // Load all enabled questions
    const allQuestions = await app.prisma.question.findMany({
      where: { enabled: true },
    });

    // Determine which questions are visible
    const answeredIds = new Set(answers.map((a) => a.questionId));
    const answerMap = new Map(answers.map((a) => [a.questionId, a.value]));

    // Check how many ISTQB products are selected (for multipleProducts condition)
    const istqbQuestion = allQuestions.find((question) => question.fieldKey === 'istqbProducts');
    let multipleProducts = false;
    if (istqbQuestion) {
      const istqbAnswer = answerMap.get(istqbQuestion.id);
      if (istqbAnswer) {
        try {
          const products = JSON.parse(istqbAnswer);
          multipleProducts = Array.isArray(products) && products.length > 1;
        } catch {
          // not JSON array
        }
      }
    }

    const context = { applicationType, entityType, multipleProducts };
    const fieldErrors: Record<string, string> = {};

    for (const question of allQuestions) {
      // Skip selector section questions from validation (they're meta)
      const isVisible = evaluateShowWhen(question.showWhen, context);
      if (!isVisible) continue;

      // Skip the selector questions themselves
      if (question.fieldKey === 'applicationType' || question.fieldKey === 'entityType') continue;

      if (question.required) {
        const value = answerMap.get(question.id);
        if (!value || value.trim() === '') {
          fieldErrors[question.fieldKey] = 'To pole jest wymagane';
          continue;
        }

        // Field-specific validation
        if (question.type === 'EMAIL') {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(value)) {
            fieldErrors[question.fieldKey] = 'Nieprawidłowy format adresu e-mail';
          }
        }

        if (question.type === 'PHONE') {
          const phoneClean = value.replace(/[\s\-\(\)\+]/g, '');
          if (phoneClean.length < 7 || !/^\d+$/.test(phoneClean)) {
            fieldErrors[question.fieldKey] = 'Nieprawidłowy numer telefonu';
          }
        }

        if (question.fieldKey === 'istqbProducts') {
          try {
            const products = JSON.parse(value);
            if (!Array.isArray(products) || products.length === 0) {
              fieldErrors[question.fieldKey] = 'Wybierz co najmniej jeden produkt';
            }
          } catch {
            fieldErrors[question.fieldKey] = 'Wybierz co najmniej jeden produkt';
          }
        }

        if (question.type === 'CHECKBOX_CONSENT' && value !== 'true') {
          fieldErrors[question.fieldKey] = 'Ta zgoda jest wymagana';
        }
      }
    }

    if (Object.keys(fieldErrors).length > 0) {
      return reply.status(400).send({
        error: 'VALIDATION_ERROR',
        message: 'Uzupełnij wymagane pola',
        details: fieldErrors,
      });
    }

    // Create submission
    const submission = await app.prisma.submission.create({
      data: {
        applicationType: applicationType,
        entityType,
        answers: {
          create: answers
            .filter((a) => {
              // Only save answers for visible questions
              const found = allQuestions.find((question) => question.id === a.questionId);
              if (!found) return false;
              if (found.fieldKey === 'applicationType' || found.fieldKey === 'entityType') return false;
              return evaluateShowWhen(found.showWhen, context);
            })
            .map((a) => ({
              questionId: a.questionId,
              value: a.value,
            })),
        },
      },
    });

    // Get confirmation text
    const confirmSetting = await app.prisma.setting.findUnique({
      where: { key: 'confirm_page_text' },
    });

    const confirmText = confirmSetting?.value?.replace(
      '{{numer}}',
      String(submission.id)
    ) || `Potwierdzamy złożenie wniosku o akredytację ISTQB®. Numer zgłoszenia: #${submission.id}. O dalszych krokach poinformujemy drogą mailową.`;

    // TODO: Send confirmation email (async, non-blocking)
    // TODO: Send notification to staff

    return reply.status(201).send({
      id: submission.id,
      trackingToken: submission.trackingToken,
      confirmText,
    });
  });

  // GET /api/form/track/:token — public tracking page
  app.get('/form/track/:token', async (request, reply) => {
    const { token } = request.params as { token: string };
    const submission = await app.prisma.submission.findUnique({
      where: { trackingToken: token },
      include: {
        statusHistory: { orderBy: { createdAt: 'desc' } },
      },
    });

    if (!submission) {
      return reply.status(404).send({ error: 'NOT_FOUND', message: 'Zgłoszenie nie znalezione' });
    }

    return {
      id: submission.id,
      status: submission.status,
      iterationCount: submission.iterationCount,
      createdAt: submission.createdAt,
      updatedAt: submission.updatedAt,
      history: submission.statusHistory.map((h) => ({
        fromStatus: h.fromStatus,
        toStatus: h.toStatus,
        comment: h.comment,
        date: h.createdAt,
      })),
    };
  });

  // GET /api/form/pricing — public pricing info
  app.get('/form/pricing', async () => {
    return {
      pricing: [
        { service: 'Akredytacja materiału — j. polski', price: '7 000,00', unit: 'netto PLN', validity: 'na czas obowiązywania sylabusa' },
        { service: 'Akredytacja materiału — j. angielski', price: '8 000,00', unit: 'netto PLN', validity: 'na czas obowiązywania sylabusa' },
        { service: 'Przeniesienie materiału szkoleniowego', price: '3 250,00', unit: 'netto PLN', validity: 'jednorazowo za materiał' },
        { service: 'Przeniesienie dostawcy szkoleń', price: '1 200,00', unit: 'netto PLN', validity: 'jednorazowo za dostawcę' },
        { service: 'Roczne utrzymanie dostawcy na liście', price: '1 200,00', unit: 'netto PLN', validity: 'rocznie za dostawcę' },
        { service: 'Materiał powiązany z dostawcą', price: '150,00', unit: 'netto PLN', validity: 'rocznie za materiał' },
        { service: 'Crossakredytacja', price: '0,00', unit: 'netto PLN', validity: '10 dni roboczych' },
      ],
      vat: '23%',
      note: 'Do cen należy doliczyć VAT 23%. Crossakredytacja jest bezpłatna.',
    };
  });
}
