import { FormConfig, FormValues } from '@/pages/client/FormPage';

interface Props {
  config: FormConfig;
  values: FormValues;
  onChange: (v: FormValues) => void;
  errors: Record<string, string>;
}

const APP_TYPES = [
  { value: 'Akredytacja materiałów szkoleniowych', label: 'Akredytacja materiałów szkoleniowych' },
  { value: 'Akredytacja dostawcy szkoleń', label: 'Akredytacja dostawcy szkoleń' },
];

const ENTITY_TYPES = [
  { value: 'Osoba fizyczna (prowadząca działalność)', label: 'Osoba fizyczna (prowadząca działalność)' },
  { value: 'Osoba prawna (firma / spółka)', label: 'Osoba prawna (firma / spółka)' },
];

export default function StepSelector({ values, onChange, errors }: Props) {
  const toggleAppType = (val: string) => {
    const current = values.applicationType;
    const next = current.includes(val)
      ? current.filter((v) => v !== val)
      : [...current, val];
    onChange({ ...values, applicationType: next });
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold mb-4">Rodzaj zgłoszenia</h2>
        <p className="text-sm text-gray-500 mb-3">Wybierz co najmniej jedną opcję:</p>
        <div className="space-y-3">
          {APP_TYPES.map((opt) => (
            <label
              key={opt.value}
              className={`flex items-center gap-3 p-4 border rounded-lg cursor-pointer transition-colors ${
                values.applicationType.includes(opt.value)
                  ? 'border-primary bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <input
                type="checkbox"
                checked={values.applicationType.includes(opt.value)}
                onChange={() => toggleAppType(opt.value)}
                className="w-5 h-5 text-primary"
              />
              <span className="font-medium">{opt.label}</span>
            </label>
          ))}
        </div>
        {errors.applicationType && (
          <p className="text-red-600 text-sm mt-2">{errors.applicationType}</p>
        )}
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-4">Typ podmiotu</h2>
        <div className="space-y-3">
          {ENTITY_TYPES.map((opt) => (
            <label
              key={opt.value}
              className={`flex items-center gap-3 p-4 border rounded-lg cursor-pointer transition-colors ${
                values.entityType === opt.value
                  ? 'border-primary bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <input
                type="radio"
                name="entityType"
                checked={values.entityType === opt.value}
                onChange={() => onChange({ ...values, entityType: opt.value })}
                className="w-5 h-5 text-primary"
              />
              <span className="font-medium">{opt.label}</span>
            </label>
          ))}
        </div>
        {errors.entityType && (
          <p className="text-red-600 text-sm mt-2">{errors.entityType}</p>
        )}
      </div>
    </div>
  );
}
