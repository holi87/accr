import { FormConfig, FormValues, Question } from '@/pages/client/FormPage';

interface Props {
  config: FormConfig;
  values: FormValues;
  getVisibleQuestions: (slug: string) => Question[];
}

export default function StepReview({ config, values, getVisibleQuestions }: Props) {
  const stepSlugs = ['dane', 'akredytacja', 'zgody'];

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">Przegląd wniosku</h2>
      <p className="text-sm text-gray-500">Sprawdź dane przed złożeniem wniosku.</p>

      {/* Selector info */}
      <div className="border rounded-lg p-4 bg-blue-50">
        <h3 className="font-medium mb-2">Rodzaj zgłoszenia</h3>
        <p className="text-sm">{values.applicationType.join(', ')}</p>
        <h3 className="font-medium mt-3 mb-2">Typ podmiotu</h3>
        <p className="text-sm">{values.entityType}</p>
      </div>

      {/* Answers per section */}
      {stepSlugs.map((slug) => {
        const section = config.sections.find((s) => s.slug === slug);
        if (!section) return null;
        const questions = getVisibleQuestions(slug);
        if (questions.length === 0) return null;

        return (
          <div key={slug} className="border rounded-lg p-4">
            <h3 className="font-medium mb-3">{section.title}</h3>
            <div className="space-y-2">
              {questions.map((q) => {
                const val = values.answers[q.id] || '';
                let displayVal = val;

                if (q.type === 'CHECKBOX_CONSENT') {
                  displayVal = val === 'true' ? '✅ Zaakceptowano' : '❌ Nie zaakceptowano';
                } else if (q.type === 'MULTI_SELECT' || q.fieldKey === 'istqbProducts') {
                  try {
                    const arr = JSON.parse(val);
                    if (Array.isArray(arr)) displayVal = arr.join(', ');
                  } catch {}
                }

                return (
                  <div key={q.id} className="flex flex-col sm:flex-row sm:gap-4 py-2 border-b border-gray-100 last:border-0">
                    <span className="text-sm text-gray-500 sm:w-1/3 flex-shrink-0">{q.label}</span>
                    <span className="text-sm font-medium">{displayVal || '—'}</span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
