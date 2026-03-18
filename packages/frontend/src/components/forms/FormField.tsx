import { Question } from '@/pages/client/FormPage';
import { useState } from 'react';

interface Props {
  question: Question;
  value: string;
  onChange: (val: string) => void;
  error?: string;
}

export default function FormField({ question, value, onChange, error }: Props) {
  const q = question;

  const baseInputClass =
    'w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary';
  const errorClass = error ? 'border-red-300' : 'border-gray-300';

  switch (q.type) {
    case 'TEXT':
    case 'EMAIL':
    case 'PHONE':
      return (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {q.label} {q.required && <span className="text-red-500">*</span>}
          </label>
          {q.helpText && <p className="text-xs text-gray-500 mb-1">{q.helpText}</p>}
          <input
            type={q.type === 'EMAIL' ? 'email' : q.type === 'PHONE' ? 'tel' : 'text'}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className={`${baseInputClass} ${errorClass}`}
          />
          {error && <p className="text-red-600 text-sm mt-1">{error}</p>}
        </div>
      );

    case 'TEXTAREA':
      return (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {q.label} {q.required && <span className="text-red-500">*</span>}
          </label>
          {q.helpText && <p className="text-xs text-gray-500 mb-1">{q.helpText}</p>}
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            rows={4}
            className={`${baseInputClass} ${errorClass}`}
          />
          {error && <p className="text-red-600 text-sm mt-1">{error}</p>}
        </div>
      );

    case 'SELECT':
      const selectOptions = (q.options as string[]) || [];
      return (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {q.label} {q.required && <span className="text-red-500">*</span>}
          </label>
          <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className={`${baseInputClass} ${errorClass}`}
          >
            <option value="">— Wybierz —</option>
            {selectOptions.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
          {error && <p className="text-red-600 text-sm mt-1">{error}</p>}
        </div>
      );

    case 'RADIO':
      const radioOptions = (q.options as string[]) || [];
      return (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {q.label} {q.required && <span className="text-red-500">*</span>}
          </label>
          {q.helpText && <p className="text-xs text-gray-500 mb-1">{q.helpText}</p>}
          <div className="space-y-2 mt-2">
            {radioOptions.map((opt) => (
              <label key={opt} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name={q.fieldKey}
                  checked={value === opt}
                  onChange={() => onChange(opt)}
                  className="w-4 h-4 text-primary"
                />
                <span className="text-sm">{opt}</span>
              </label>
            ))}
          </div>
          {error && <p className="text-red-600 text-sm mt-1">{error}</p>}
        </div>
      );

    case 'MULTI_SELECT':
      return <MultiSelectField question={q} value={value} onChange={onChange} error={error} />;

    default:
      return null;
  }
}

function MultiSelectField({ question, value, onChange, error }: Props) {
  const rawOptions = question.options as unknown;

  // Normalize options to grouped format: [{ group, items }]
  const grouped = normalizeToGrouped(rawOptions);

  let selected: string[] = [];
  try { selected = JSON.parse(value) || []; } catch { selected = []; }

  const toggle = (item: string) => {
    const next = selected.includes(item)
      ? selected.filter((s) => s !== item)
      : [...selected, item];
    onChange(JSON.stringify(next));
  };

  if (grouped.length > 0) {
    return (
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {question.label} {question.required && <span className="text-red-500">*</span>}
        </label>
        {question.helpText && <p className="text-xs text-gray-500 mb-1">{question.helpText}</p>}
        <div className="border rounded-lg p-3 max-h-72 overflow-y-auto space-y-3">
          {grouped.map((g) => (
            <div key={g.group}>
              <p className="text-xs font-semibold text-gray-500 uppercase mb-1">{g.group}</p>
              {g.items.map((item) => (
                <label key={item} className="flex items-center gap-2 py-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selected.includes(item)}
                    onChange={() => toggle(item)}
                    className="w-4 h-4 text-primary"
                  />
                  <span className="text-sm">{item}</span>
                </label>
              ))}
            </div>
          ))}
        </div>
        {selected.length > 0 && (
          <p className="text-xs text-gray-500 mt-1">Wybrano: {selected.length}</p>
        )}
        {error && <p className="text-red-600 text-sm mt-1">{error}</p>}
      </div>
    );
  }

  // Flat list fallback (no groups)
  const flatItems = Array.isArray(rawOptions) ? (rawOptions as string[]) : [];
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {question.label} {question.required && <span className="text-red-500">*</span>}
      </label>
      {flatItems.length > 0 ? (
        <div className="space-y-1">
          {flatItems.map((item) => (
            <label key={String(item)} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={selected.includes(String(item))}
                onChange={() => toggle(String(item))}
                className="w-4 h-4 text-primary"
              />
              <span className="text-sm">{String(item)}</span>
            </label>
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-400">Brak opcji</p>
      )}
      {error && <p className="text-red-600 text-sm mt-1">{error}</p>}
    </div>
  );
}

/** Normalize various option formats to [{ group, items }] */
function normalizeToGrouped(options: unknown): { group: string; items: string[] }[] {
  if (!options || typeof options !== 'object') return [];

  // Format 1: [{ group: "...", items: ["..."] }] — already grouped array
  if (Array.isArray(options) && options.length > 0 && typeof options[0] === 'object' && options[0] !== null && 'group' in options[0]) {
    return options as { group: string; items: string[] }[];
  }

  // Format 2: { "Group Name": ["item1", "item2"] } — object with group keys
  if (!Array.isArray(options) && typeof options === 'object') {
    const entries = Object.entries(options as Record<string, unknown>);
    if (entries.length > 0 && Array.isArray(entries[0][1])) {
      return entries.map(([group, items]) => ({
        group,
        items: (items as string[]).map(String),
      }));
    }
  }

  return [];
}
