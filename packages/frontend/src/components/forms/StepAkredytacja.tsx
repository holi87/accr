import { Question, FormValues } from '@/pages/client/FormPage';
import FormField from './FormField';

interface Props {
  questions: Question[];
  values: FormValues;
  onChange: (v: FormValues) => void;
  errors: Record<string, string>;
}

export default function StepAkredytacja({ questions, values, onChange, errors }: Props) {
  const setAnswer = (qId: number, val: string) => {
    onChange({ ...values, answers: { ...values.answers, [qId]: val } });
  };

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">O akredytacji</h2>
      {questions.map((q) => (
        <FormField
          key={q.id}
          question={q}
          value={values.answers[q.id] || ''}
          onChange={(val) => setAnswer(q.id, val)}
          error={errors[q.fieldKey]}
        />
      ))}
    </div>
  );
}
