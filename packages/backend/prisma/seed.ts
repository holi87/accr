import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function upsertSection(slug: string, title: string, order: number, description?: string) {
  return prisma.section.upsert({
    where: { slug },
    update: { title, order, description },
    create: { slug, title, order, description },
  });
}

async function upsertQuestion(
  sectionId: number,
  fieldKey: string,
  data: {
    label: string;
    type: string;
    required?: boolean;
    options?: unknown;
    order: number;
    isConsent?: boolean;
    consentText?: string;
    helpText?: string;
    showWhen?: unknown;
  }
) {
  const record = {
    sectionId,
    label: data.label,
    type: data.type as any,
    required: data.required ?? true,
    options: data.options ?? undefined,
    order: data.order,
    isConsent: data.isConsent ?? false,
    consentText: data.consentText ?? null,
    helpText: data.helpText ?? null,
    showWhen: data.showWhen ?? undefined,
    enabled: true,
  };

  return prisma.question.upsert({
    where: { fieldKey },
    update: record,
    create: { fieldKey, ...record },
  });
}

async function upsertSetting(key: string, value: string) {
  return prisma.setting.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  });
}

async function main() {
  console.log('Seeding sections and questions...');

  // ── Section 0: Selector ──────────────────────────────────────────────
  const sSelector = await upsertSection('selector', 'Rodzaj zgłoszenia', 0);

  await upsertQuestion(sSelector.id, 'applicationType', {
    label: 'Rodzaj zgłoszenia',
    type: 'MULTI_SELECT',
    order: 0,
    options: [
      'Akredytacja materiałów szkoleniowych',
      'Akredytacja dostawcy szkoleń',
    ],
  });

  await upsertQuestion(sSelector.id, 'entityType', {
    label: 'Typ podmiotu',
    type: 'RADIO',
    order: 1,
    options: [
      'Osoba fizyczna (prowadząca działalność)',
      'Osoba prawna (firma / spółka)',
    ],
  });

  // ── Section 1: Dane zgłaszającego ────────────────────────────────────
  const sDane = await upsertSection('dane', 'Dane zgłaszającego', 1);

  await upsertQuestion(sDane.id, 'email', {
    label: 'Adres e-mail',
    type: 'EMAIL',
    order: 0,
  });

  await upsertQuestion(sDane.id, 'phone', {
    label: 'Dane kontaktowe — telefon',
    type: 'PHONE',
    order: 1,
  });

  await upsertQuestion(sDane.id, 'fullName', {
    label: 'Imię i nazwisko',
    type: 'TEXT',
    order: 2,
    showWhen: { entityType: 'fizyczna' },
  });

  await upsertQuestion(sDane.id, 'companyName', {
    label: 'Nazwa firmy',
    type: 'TEXT',
    order: 3,
    showWhen: { entityType: 'prawna' },
  });

  await upsertQuestion(sDane.id, 'contactPersonName', {
    label: 'Imię i nazwisko osoby składającej wniosek',
    type: 'TEXT',
    order: 4,
    showWhen: { entityType: 'prawna' },
  });

  await upsertQuestion(sDane.id, 'invoiceData', {
    label: 'Dane do faktury',
    type: 'TEXTAREA',
    order: 5,
  });

  await upsertQuestion(sDane.id, 'ownerData', {
    label: 'Dane właściciela materiałów',
    type: 'TEXTAREA',
    order: 6,
    showWhen: { applicationType: ['materialy'] },
  });

  await upsertQuestion(sDane.id, 'trainingExperience', {
    label: 'Doświadczenie w prowadzeniu szkoleń',
    type: 'TEXTAREA',
    order: 7,
    showWhen: { applicationType: ['dostawca'] },
  });

  // ── Section 2: O akredytacji ─────────────────────────────────────────
  const sAkredytacja = await upsertSection('akredytacja', 'O akredytacji', 2);

  await upsertQuestion(sAkredytacja.id, 'language', {
    label: 'Język akredytacji',
    type: 'SELECT',
    order: 0,
    options: ['polski', 'angielski'],
  });

  await upsertQuestion(sAkredytacja.id, 'istqbProducts', {
    label: 'Poziom akredytacji (produkty ISTQB®)',
    type: 'MULTI_SELECT',
    order: 1,
    options: {
      'Foundation Level': ['CTFL v4.0'],
      'Advanced Level': ['CTAL-TA', 'CTAL-TM', 'CTAL-TTA'],
      Specialist: [
        'Performance Testing',
        'Security Testing',
        'AI Testing',
        'Usability Testing',
        'Test Automation Engineering',
        'Automotive Software Testing',
        'Mobile Application Testing',
        'Acceptance Testing',
        'Gambling Industry Testing',
        'Model-Based Testing',
      ],
    },
  });

  await upsertQuestion(sAkredytacja.id, 'materialAccreditationType', {
    label: 'Rodzaj akredytacji materiałów',
    type: 'RADIO',
    order: 2,
    options: ['Akredytacja materiałów', 'Crossakredytacja materiałów', 'Przeniesienie materiału szkoleniowego'],
    showWhen: { applicationType: ['materialy'] },
  });

  await upsertQuestion(sAkredytacja.id, 'providerAccreditationType', {
    label: 'Rodzaj akredytacji dostawcy',
    type: 'RADIO',
    order: 3,
    options: ['Akredytacja (pierwsza)', 'Rozszerzenie zakresu akredytacji', 'Przeniesienie dostawcy szkoleń'],
    showWhen: { applicationType: ['dostawca'] },
  });

  await upsertQuestion(sAkredytacja.id, 'languagePerProduct', {
    label: 'Języki akredytacji per produkt',
    type: 'TEXTAREA',
    required: false,
    order: 4,
    helpText:
      'Jeśli języki akredytacji są różne dla różnych produktów, proszę podać język akredytacji dla każdego produktu osobno.',
    showWhen: { applicationType: ['dostawca'], multipleProducts: true },
  });

  // ── Section 3: Zgody i oświadczenia ──────────────────────────────────
  const sZgody = await upsertSection('zgody', 'Zgody i oświadczenia', 3);

  // Universal consents
  await upsertQuestion(sZgody.id, 'consentRodoProcess', {
    label: 'Zgoda RODO — proces',
    type: 'CHECKBOX_CONSENT',
    order: 0,
    isConsent: true,
    consentText:
      'Wyrażam zgodę na przetwarzanie przez Stowarzyszenie Jakości Systemów Informatycznych moich danych osobowych w celu przeprowadzenia procesu akredytacyjnego.',
  });

  await upsertQuestion(sZgody.id, 'consentRodoAck', {
    label: 'Oświadczenie RODO',
    type: 'CHECKBOX_CONSENT',
    order: 1,
    isConsent: true,
    consentText:
      'Oświadczam, że zapoznałem/-am się z informacją o przetwarzaniu moich danych osobowych znajdującą się na stronie https://sjsi.org/ist-qb/procesy-akredytacji-i-oplaty/ oraz że powyższe zgody wyrażone zostały dobrowolnie.',
  });

  // Materials + natural person
  await upsertQuestion(sZgody.id, 'consentMatPubFiz', {
    label: 'Publikacja materiałów (os. fiz.)',
    type: 'CHECKBOX_CONSENT',
    order: 2,
    isConsent: true,
    consentText:
      'Wyrażam zgodę na przetwarzanie przez SJSI moich danych osobowych w celu umieszczenia na stronie sjsi.org informacji o fakcie uzyskania przeze mnie akredytacji na materiały szkoleniowe mojego autorstwa, wraz z oznaczeniem zakresu / specyfikacji uzyskanej akredytacji.',
    showWhen: { applicationType: ['materialy'], entityType: 'fizyczna' },
  });

  // Materials + company
  await upsertQuestion(sZgody.id, 'consentMatPubPraw', {
    label: 'Publikacja materiałów (firma)',
    type: 'CHECKBOX_CONSENT',
    order: 3,
    isConsent: true,
    consentText:
      'W imieniu podmiotu, który reprezentuję, oświadczam, że wyrażam zgodę na umieszczenie na stronie sjsi.org informacji o uzyskaniu przez reprezentowany przeze mnie podmiot akredytacji na materiały szkoleniowe wraz z oznaczeniem zakresu uzyskanej akredytacji.',
    showWhen: { applicationType: ['materialy'], entityType: 'prawna' },
  });

  // Provider + natural person
  await upsertQuestion(sZgody.id, 'consentDostPubFiz', {
    label: 'Publikacja dostawcy (os. fiz.)',
    type: 'CHECKBOX_CONSENT',
    order: 4,
    isConsent: true,
    consentText:
      'Wyrażam zgodę na przetwarzanie przez SJSI moich danych osobowych w celu umieszczenia na stronie https://sjsi.org/akredytacje/akredytowani-dostawcy-szkolen/ oraz https://www.istqb.org/certifications/find-a-training-provider informacji o fakcie uzyskania przeze mnie akredytacji / rozszerzenia zakresu akredytacji wraz z oznaczeniem zakresu / specyfikacji uzyskanej akredytacji.',
    showWhen: { applicationType: ['dostawca'], entityType: 'fizyczna' },
  });

  await upsertQuestion(sZgody.id, 'consentDostMatFiz', {
    label: 'Oświadczenie — materiały',
    type: 'CHECKBOX_CONSENT',
    order: 5,
    isConsent: true,
    consentText:
      'Oświadczam, że posiadam akredytowane materiały szkoleniowe (lub dostęp do takich materiałów)',
    showWhen: { applicationType: ['dostawca'], entityType: 'fizyczna' },
  });

  await upsertQuestion(sZgody.id, 'consentDostTrenerFiz', {
    label: 'Oświadczenie — trenerzy',
    type: 'CHECKBOX_CONSENT',
    order: 6,
    isConsent: true,
    consentText:
      'Oświadczam, że nawiązałem/-am współpracę z akredytowanymi trenerami',
    showWhen: { applicationType: ['dostawca'], entityType: 'fizyczna' },
  });

  // Provider + company
  await upsertQuestion(sZgody.id, 'consentDostPubPraw', {
    label: 'Publikacja dostawcy (firma)',
    type: 'CHECKBOX_CONSENT',
    order: 7,
    isConsent: true,
    consentText:
      'W imieniu podmiotu, który reprezentuję, oświadczam, że wyrażam zgodę na umieszczenie na stronie https://sjsi.org/akredytacje/akredytowani-dostawcy-szkolen/ oraz https://www.istqb.org/certifications/find-a-training-provider informacji o uzyskaniu przez reprezentowany przeze mnie podmiot akredytacji / rozszerzenia zakresu akredytacji wraz z oznaczeniem zakresu uzyskanej akredytacji.',
    showWhen: { applicationType: ['dostawca'], entityType: 'prawna' },
  });

  await upsertQuestion(sZgody.id, 'consentDostMatPraw', {
    label: 'Oświadczenie — materiały (firma)',
    type: 'CHECKBOX_CONSENT',
    order: 8,
    isConsent: true,
    consentText:
      'W imieniu podmiotu, który reprezentuję, oświadczam, że posiadam akredytowane materiały szkoleniowe (lub dostęp do takich materiałów)',
    showWhen: { applicationType: ['dostawca'], entityType: 'prawna' },
  });

  await upsertQuestion(sZgody.id, 'consentDostTrenerPraw', {
    label: 'Oświadczenie — trenerzy (firma)',
    type: 'CHECKBOX_CONSENT',
    order: 9,
    isConsent: true,
    consentText:
      'W imieniu podmiotu, który reprezentuję, oświadczam, że nawiązałem/-am współpracę z akredytowanymi trenerami',
    showWhen: { applicationType: ['dostawca'], entityType: 'prawna' },
  });

  // ── Settings ─────────────────────────────────────────────────────────
  console.log('Seeding default settings...');

  await upsertSetting(
    'confirm_page_text',
    'Potwierdzamy złożenie wniosku o akredytację ISTQB®. Numer zgłoszenia: #{{numer}}. O dalszych krokach poinformujemy drogą mailową. Pozdrawiamy, Komisja Akredytacyjna SJSI'
  );

  await upsertSetting(
    'email_template_confirmation',
    JSON.stringify({
      enabled: false,
      subject: 'Potwierdzenie złożenia wniosku o akredytację ISTQB® #{{numer}}',
      body: 'Szanowni Państwo,\n\nPotwierdzamy złożenie wniosku o akredytację ISTQB®.\nNumer zgłoszenia: #{{numer}}\n\nO dalszych krokach poinformujemy drogą mailową.\n\nPozdrawiamy,\nKomisja Akredytacyjna SJSI',
    })
  );

  await upsertSetting(
    'email_template_notification',
    JSON.stringify({
      subject: 'Nowe zgłoszenie akredytacyjne #{{numer}}',
      body: 'Wpłynęło nowe zgłoszenie akredytacyjne.\n\nNumer: #{{numer}}\nTyp: {{typ}}\nPodmiot: {{podmiot}}\n\nSprawdź szczegóły w panelu administracyjnym.',
    })
  );

  // ── Pricing ───────────────────────────────────────────────────────
  console.log('Seeding default pricing...');

  await upsertSetting(
    'pricing',
    JSON.stringify({
      items: [
        { id: 'akredytacja_pl', service: 'Akredytacja materiału — j. polski', priceNet: 7000, perUnit: 'za materiał', validity: 'na czas obowiązywania sylabusa', applicableTo: 'materialy' },
        { id: 'akredytacja_en', service: 'Akredytacja materiału — j. angielski', priceNet: 8000, perUnit: 'za materiał', validity: 'na czas obowiązywania sylabusa', applicableTo: 'materialy' },
        { id: 'crossakredytacja', service: 'Crossakredytacja materiału', priceNet: 0, perUnit: 'za materiał', validity: '10 dni roboczych', applicableTo: 'materialy' },
        { id: 'przeniesienie_materialu', service: 'Przeniesienie materiału szkoleniowego', priceNet: 3250, perUnit: 'za materiał', validity: 'jednorazowo', applicableTo: 'materialy' },
        { id: 'przeniesienie_dostawcy', service: 'Przeniesienie dostawcy szkoleń', priceNet: 1200, perUnit: 'za dostawcę', validity: 'jednorazowo', applicableTo: 'dostawca' },
        { id: 'utrzymanie_dostawcy', service: 'Roczne utrzymanie dostawcy na liście', priceNet: 1200, perUnit: 'za dostawcę', validity: 'rocznie', applicableTo: 'dostawca' },
        { id: 'material_dostawca', service: 'Materiał powiązany z dostawcą', priceNet: 150, perUnit: 'za materiał', validity: 'rocznie', applicableTo: 'dostawca' },
      ],
      vatRate: 23,
      note: 'Wszystkie kwoty netto PLN. Do cen należy doliczyć VAT 23%.',
    })
  );

  console.log('Seed complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
