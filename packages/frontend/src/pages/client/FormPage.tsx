import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import StepSelector from '@/components/forms/StepSelector';
import StepDane from '@/components/forms/StepDane';
import StepAkredytacja from '@/components/forms/StepAkredytacja';
import StepZgody from '@/components/forms/StepZgody';
import StepReview from '@/components/forms/StepReview';
import CostEstimate from '@/components/forms/CostEstimate';

export interface FormConfig {
  sections: Section[];
}

export interface Section {
  id: number;
  slug: string;
  title: string;
  description: string | null;
  order: number;
  questions: Question[];
}

export interface Question {
  id: number;
  sectionId: number;
  fieldKey: string;
  label: string;
  helpText: string | null;
  type: string;
  required: boolean;
  options: unknown;
  order: number;
  isConsent: boolean;
  consentText: string | null;
  enabled: boolean;
  showWhen: Record<string, unknown> | null;
}

export interface FormValues {
  applicationType: string[];
  entityType: string;
  answers: Record<number, string>;
}

function evaluateShowWhen(
  showWhen: Record<string, unknown> | null,
  ctx: { applicationType: string[]; entityType: string; multipleProducts: boolean }
): boolean {
  if (!showWhen) return true;
  for (const [key, value] of Object.entries(showWhen)) {
    if (key === 'applicationType' && Array.isArray(value)) {
      const normalized = ctx.applicationType.map(normalizeType);
      const hasMatch = value.some((v: string) => normalized.includes(normalizeType(v)));
      if (!hasMatch) return false;
    }
    if (key === 'entityType' && typeof value === 'string') {
      if (normalizeEntity(ctx.entityType) !== normalizeEntity(value)) return false;
    }
    if (key === 'multipleProducts' && value === true && !ctx.multipleProducts) return false;
  }
  return true;
}

function normalizeType(t: string): string {
  const l = t.toLowerCase();
  if (l.includes('materiał') || l.includes('material')) return 'materialy';
  if (l.includes('dostawc')) return 'dostawca';
  return l;
}

function normalizeEntity(t: string): string {
  const l = t.toLowerCase();
  if (l.includes('fizyczn')) return 'fizyczna';
  if (l.includes('prawn')) return 'prawna';
  return l;
}

const STEP_LABELS = ['Rodzaj zgłoszenia', 'Dane zgłaszającego', 'O akredytacji', 'Zgody', 'Przegląd'];

export default function FormPage() {
  const navigate = useNavigate();
  const [config, setConfig] = useState<FormConfig | null>(null);
  const [step, setStep] = useState(0);
  const [values, setValues] = useState<FormValues>({
    applicationType: [],
    entityType: '',
    answers: {},
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    api.get<FormConfig>('/form/config').then(setConfig).catch(console.error);
  }, []);

  const getVisibleQuestions = useCallback(
    (sectionSlug: string): Question[] => {
      if (!config) return [];
      const section = config.sections.find((s) => s.slug === sectionSlug);
      if (!section) return [];

      const istqbQ = config.sections
        .flatMap((s) => s.questions)
        .find((q) => q.fieldKey === 'istqbProducts');
      let multipleProducts = false;
      if (istqbQ && values.answers[istqbQ.id]) {
        try {
          const arr = JSON.parse(values.answers[istqbQ.id]);
          multipleProducts = Array.isArray(arr) && arr.length > 1;
        } catch {}
      }

      const ctx = { applicationType: values.applicationType, entityType: values.entityType, multipleProducts };
      return section.questions.filter((q) => evaluateShowWhen(q.showWhen, ctx));
    },
    [config, values]
  );

  const validateStep = useCallback(
    (stepIdx: number): boolean => {
      const newErrors: Record<string, string> = {};
      if (stepIdx === 0) {
        if (values.applicationType.length === 0) newErrors['applicationType'] = 'Wybierz co najmniej jeden rodzaj';
        if (!values.entityType) newErrors['entityType'] = 'Wybierz typ podmiotu';
      } else {
        const slugMap = ['selector', 'dane', 'akredytacja', 'zgody'];
        const slug = slugMap[stepIdx];
        if (slug) {
          const questions = getVisibleQuestions(slug);
          for (const q of questions) {
            if (q.fieldKey === 'applicationType' || q.fieldKey === 'entityType') continue;
            const val = values.answers[q.id] || '';
            if (q.required && !val.trim()) {
              newErrors[q.fieldKey] = 'To pole jest wymagane';
            }
            if (q.type === 'EMAIL' && val && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
              newErrors[q.fieldKey] = 'Nieprawidłowy format email';
            }
            if (q.type === 'PHONE' && val) {
              const clean = val.replace(/[\s\-\(\)\+]/g, '');
              if (clean.length < 7) newErrors[q.fieldKey] = 'Nieprawidłowy numer telefonu';
            }
            if (q.fieldKey === 'istqbProducts' && q.required) {
              try {
                const arr = JSON.parse(val);
                if (!Array.isArray(arr) || arr.length === 0) newErrors[q.fieldKey] = 'Wybierz co najmniej jeden produkt';
              } catch {
                newErrors[q.fieldKey] = 'Wybierz co najmniej jeden produkt';
              }
            }
            if (q.type === 'CHECKBOX_CONSENT' && q.required && val !== 'true') {
              newErrors[q.fieldKey] = 'Ta zgoda jest wymagana';
            }
          }
        }
      }
      setErrors(newErrors);
      return Object.keys(newErrors).length === 0;
    },
    [values, getVisibleQuestions]
  );

  const handleNext = () => {
    if (validateStep(step)) setStep((s) => Math.min(s + 1, 4));
  };

  const handlePrev = () => setStep((s) => Math.max(s - 1, 0));

  const handleSubmit = async () => {
    setSubmitting(true);
    setSubmitError('');
    try {
      const allAnswers = Object.entries(values.answers).map(([qId, value]) => ({
        questionId: parseInt(qId),
        value,
      }));
      const res = await api.post<{ id: number; trackingToken: string; confirmText: string }>('/form/submit', {
        applicationType: values.applicationType.map(normalizeType),
        entityType: normalizeEntity(values.entityType),
        answers: allAnswers,
      });
      navigate(`/confirmation/${res.id}`, {
        state: { confirmText: res.confirmText, trackingToken: res.trackingToken },
      });
    } catch (err: unknown) {
      const error = err as { message?: string; details?: Record<string, string> };
      setSubmitError(error.message || 'Wystąpił błąd');
      if (error.details) setErrors(error.details);
    } finally {
      setSubmitting(false);
    }
  };

  if (!config) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-center mb-8">Wniosek o akredytację ISTQB®</h1>

        {/* Stepper */}
        <div className="flex items-center justify-between mb-8">
          {STEP_LABELS.map((label, i) => (
            <div key={i} className="flex items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  i <= step ? 'bg-primary text-white' : 'bg-gray-200 text-gray-500'
                }`}
              >
                {i + 1}
              </div>
              <span className={`ml-2 text-sm hidden sm:inline ${i <= step ? 'text-primary font-medium' : 'text-gray-400'}`}>
                {label}
              </span>
              {i < STEP_LABELS.length - 1 && <div className="w-8 h-px bg-gray-300 mx-2" />}
            </div>
          ))}
        </div>

        {/* Step content */}
        <div className="bg-white rounded-xl shadow p-6 mb-6">
          {step === 0 && (
            <StepSelector config={config} values={values} onChange={setValues} errors={errors} />
          )}
          {step === 1 && (
            <StepDane
              questions={getVisibleQuestions('dane')}
              values={values}
              onChange={setValues}
              errors={errors}
            />
          )}
          {step === 2 && (
            <StepAkredytacja
              questions={getVisibleQuestions('akredytacja')}
              values={values}
              onChange={setValues}
              errors={errors}
            />
          )}
          {step === 3 && (
            <StepZgody
              questions={getVisibleQuestions('zgody')}
              values={values}
              onChange={setValues}
              errors={errors}
            />
          )}
          {step === 4 && (
            <>
              <StepReview config={config} values={values} getVisibleQuestions={getVisibleQuestions} />
              <CostEstimate
                applicationType={values.applicationType}
                entityType={values.entityType}
                language={(() => {
                  const q = config.sections.flatMap((s) => s.questions).find((q) => q.fieldKey === 'language');
                  return q ? values.answers[q.id] || '' : '';
                })()}
                materialAccreditationType={(() => {
                  const q = config.sections.flatMap((s) => s.questions).find((q) => q.fieldKey === 'materialAccreditationType');
                  return q ? values.answers[q.id] || '' : '';
                })()}
                providerAccreditationType={(() => {
                  const q = config.sections.flatMap((s) => s.questions).find((q) => q.fieldKey === 'providerAccreditationType');
                  return q ? values.answers[q.id] || '' : '';
                })()}
                productCount={(() => {
                  const q = config.sections.flatMap((s) => s.questions).find((q) => q.fieldKey === 'istqbProducts');
                  if (!q) return 1;
                  try {
                    const arr = JSON.parse(values.answers[q.id] || '[]');
                    return Array.isArray(arr) ? arr.length : 1;
                  } catch {
                    return 1;
                  }
                })()}
              />
            </>
          )}
        </div>

        {submitError && (
          <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-4">{submitError}</div>
        )}

        {/* Navigation */}
        <div className="flex justify-between">
          <button
            onClick={step === 0 ? () => navigate('/') : handlePrev}
            className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
          >
            {step === 0 ? 'Anuluj' : 'Wstecz'}
          </button>
          {step < 4 ? (
            <button
              onClick={handleNext}
              className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-blue-700"
            >
              Dalej
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="px-8 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              {submitting ? 'Wysyłanie...' : 'Złóż wniosek'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
