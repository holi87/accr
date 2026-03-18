import { Question, FormValues } from '@/pages/client/FormPage';

interface Props {
  questions: Question[];
  values: FormValues;
  onChange: (v: FormValues) => void;
  errors: Record<string, string>;
}

export default function StepZgody({ questions, values, onChange, errors }: Props) {
  const toggleConsent = (qId: number) => {
    const current = values.answers[qId];
    onChange({
      ...values,
      answers: { ...values.answers, [qId]: current === 'true' ? '' : 'true' },
    });
  };

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">Zgody i oświadczenia</h2>
      <p className="text-sm text-gray-500">Wszystkie poniższe zgody są wymagane do złożenia wniosku.</p>
      {questions.map((q) => (
        <div key={q.id} className="border rounded-lg p-4">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={values.answers[q.id] === 'true'}
              onChange={() => toggleConsent(q.id)}
              className="mt-1 w-5 h-5 text-primary flex-shrink-0"
            />
            <div>
              <span className="text-sm font-medium">{q.label}</span>
              {q.consentText && (
                <p
                  className="text-sm text-gray-600 mt-1"
                  dangerouslySetInnerHTML={{ __html: q.consentText }}
                />
              )}
            </div>
          </label>
          {errors[q.fieldKey] && (
            <p className="text-red-600 text-sm mt-2 ml-8">{errors[q.fieldKey]}</p>
          )}
        </div>
      ))}
    </div>
  );
}
