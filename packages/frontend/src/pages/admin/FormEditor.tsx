import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';

interface Question {
  id: number;
  fieldKey: string;
  label: string;
  helpText: string | null;
  type: string;
  required: boolean;
  enabled: boolean;
  options: unknown;
  order: number;
  isConsent: boolean;
  consentText: string | null;
  showWhen: Record<string, unknown> | null;
}

interface Section {
  id: number;
  slug: string;
  title: string;
  description: string | null;
  order: number;
  questions: Question[];
}

const FIELD_TYPES = ['TEXT', 'TEXTAREA', 'EMAIL', 'PHONE', 'SELECT', 'MULTI_SELECT', 'RADIO', 'CHECKBOX', 'CHECKBOX_CONSENT'];
const APP_TYPE_OPTIONS = ['materialy', 'dostawca'];
const ENTITY_TYPE_OPTIONS = ['fizyczna', 'prawna'];

function showWhenLabel(sw: Record<string, unknown> | null): string {
  if (!sw) return 'Zawsze widoczne';
  const parts: string[] = [];
  if (sw.applicationType) parts.push(`typ: ${(sw.applicationType as string[]).join(', ')}`);
  if (sw.entityType) parts.push(`podmiot: ${sw.entityType}`);
  if (sw.multipleProducts) parts.push('wiele produktów');
  return parts.length > 0 ? parts.join(' + ') : 'Zawsze widoczne';
}

export default function FormEditor() {
  const navigate = useNavigate();
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [openSections, setOpenSections] = useState<Set<number>>(new Set());
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [addingTo, setAddingTo] = useState<number | null>(null);
  const [tab, setTab] = useState<'sections' | 'consents' | 'istqb'>('sections');

  // New question form
  const [newQ, setNewQ] = useState({
    fieldKey: '', label: '', helpText: '', type: 'TEXT', required: true,
    isConsent: false, consentText: '', options: '',
    showWhenAppType: [] as string[], showWhenEntity: '', showWhenMultiProducts: false,
  });

  useEffect(() => {
    api
      .get<{ sections: Section[] }>('/admin/form/sections')
      .then((data) => {
        setSections(data.sections);
        // Open all sections by default
        setOpenSections(new Set(data.sections.map((s) => s.id)));
      })
      .catch((err) => {
        if (err?.status === 401) { navigate('/admin/login'); return; }
        if (err?.status === 403) { setError('Brak uprawnień — wymagana rola ADMIN'); return; }
        setError('Nie udało się pobrać konfiguracji formularza');
      })
      .finally(() => setLoading(false));
  }, [navigate]);

  const toggleSection = (id: number) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleEnabled = async (q: Question) => {
    try {
      await api.put(`/admin/form/questions/${q.id}`, { enabled: !q.enabled });
      setSections((prev) =>
        prev.map((s) => ({
          ...s,
          questions: s.questions.map((qq) =>
            qq.id === q.id ? { ...qq, enabled: !qq.enabled } : qq,
          ),
        })),
      );
    } catch {
      setError('Nie udało się zaktualizować');
    }
  };

  const saveQuestion = async (q: Question) => {
    try {
      await api.put(`/admin/form/questions/${q.id}`, {
        label: q.label,
        helpText: q.helpText || null,
        type: q.type,
        required: q.required,
        enabled: q.enabled,
        isConsent: q.isConsent,
        consentText: q.consentText || null,
        options: q.options,
        showWhen: q.showWhen,
      });
      setSections((prev) =>
        prev.map((s) => ({
          ...s,
          questions: s.questions.map((qq) => (qq.id === q.id ? q : qq)),
        })),
      );
      setEditingQuestion(null);
      setSuccess('Zapisano pytanie');
      setTimeout(() => setSuccess(''), 3000);
    } catch {
      setError('Nie udało się zapisać pytania');
    }
  };

  const deleteQuestion = async (qId: number) => {
    if (!confirm('Czy na pewno chcesz usunąć to pytanie?')) return;
    try {
      await api.delete(`/admin/form/questions/${qId}`);
      setSections((prev) =>
        prev.map((s) => ({ ...s, questions: s.questions.filter((q) => q.id !== qId) })),
      );
      setSuccess('Usunięto pytanie');
      setTimeout(() => setSuccess(''), 3000);
    } catch {
      setError('Nie udało się usunąć pytania');
    }
  };

  const buildShowWhen = () => {
    const sw: Record<string, unknown> = {};
    if (newQ.showWhenAppType.length > 0) sw.applicationType = newQ.showWhenAppType;
    if (newQ.showWhenEntity) sw.entityType = newQ.showWhenEntity;
    if (newQ.showWhenMultiProducts) sw.multipleProducts = true;
    return Object.keys(sw).length > 0 ? sw : null;
  };

  const addQuestion = async (sectionId: number) => {
    try {
      const maxOrder = sections.find((s) => s.id === sectionId)?.questions.length || 0;
      let parsedOptions = null;
      if (newQ.options.trim()) {
        try { parsedOptions = JSON.parse(newQ.options); } catch {
          parsedOptions = newQ.options.split('\n').map((l) => l.trim()).filter(Boolean);
        }
      }

      const q = await api.post<Question>(`/admin/form/sections/${sectionId}/questions`, {
        fieldKey: newQ.fieldKey,
        label: newQ.label,
        helpText: newQ.helpText || null,
        type: newQ.isConsent ? 'CHECKBOX_CONSENT' : newQ.type,
        required: newQ.required,
        isConsent: newQ.isConsent,
        consentText: newQ.isConsent ? newQ.consentText : null,
        options: parsedOptions,
        order: maxOrder,
        showWhen: buildShowWhen(),
      });

      setSections((prev) =>
        prev.map((s) => (s.id === sectionId ? { ...s, questions: [...s.questions, q] } : s)),
      );
      setAddingTo(null);
      setNewQ({ fieldKey: '', label: '', helpText: '', type: 'TEXT', required: true, isConsent: false, consentText: '', options: '', showWhenAppType: [], showWhenEntity: '', showWhenMultiProducts: false });
      setSuccess('Dodano pytanie');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: unknown) {
      setError((err as { message?: string })?.message || 'Nie udało się dodać pytania');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  const allConsents = sections.flatMap((s) => s.questions.filter((q) => q.isConsent));

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Edytor formularza</h1>

      {error && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded text-sm">{error}</div>}
      {success && <div className="mb-4 p-3 bg-green-50 text-green-700 rounded text-sm">{success}</div>}

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b">
        <button
          onClick={() => setTab('sections')}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${tab === 'sections' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          Sekcje i pytania
        </button>
        <button
          onClick={() => setTab('consents')}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${tab === 'consents' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          Zgody i oświadczenia ({allConsents.length})
        </button>
        <button
          onClick={() => setTab('istqb')}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${tab === 'istqb' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          Produkty ISTQB®
        </button>
      </div>

      {tab === 'sections' && (
        <div className="space-y-3">
          {sections.map((section) => (
            <div key={section.id} className="bg-white rounded-lg shadow border">
              <button
                onClick={() => toggleSection(section.id)}
                className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50"
              >
                <div>
                  <span className="font-medium">{section.title}</span>
                  <span className="text-xs text-gray-400 ml-2">({section.slug})</span>
                </div>
                <span className="text-gray-400 text-sm">
                  {section.questions.length} pytań · {openSections.has(section.id) ? '▲' : '▼'}
                </span>
              </button>

              {openSections.has(section.id) && (
                <div className="border-t px-4 pb-4">
                  {section.questions.map((q) => (
                    <div key={q.id} className={`py-3 border-b border-gray-100 last:border-0 ${!q.enabled ? 'opacity-50' : ''}`}>
                      {editingQuestion?.id === q.id ? (
                        <QuestionEditForm
                          question={editingQuestion}
                          onChange={setEditingQuestion}
                          onSave={() => saveQuestion(editingQuestion)}
                          onCancel={() => setEditingQuestion(null)}
                        />
                      ) : (
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium">{q.label}</p>
                            <div className="flex flex-wrap gap-1.5 mt-1">
                              <span className="px-1.5 py-0.5 bg-gray-100 rounded text-xs">{q.type}</span>
                              <span className="px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded text-xs">{q.fieldKey}</span>
                              {q.required && <span className="px-1.5 py-0.5 bg-red-50 text-red-600 rounded text-xs">wymagane</span>}
                              {q.isConsent && <span className="px-1.5 py-0.5 bg-purple-50 text-purple-600 rounded text-xs">zgoda</span>}
                              <span className="px-1.5 py-0.5 bg-yellow-50 text-yellow-700 rounded text-xs">{showWhenLabel(q.showWhen)}</span>
                            </div>
                            {q.helpText && <p className="text-xs text-gray-500 mt-1">{q.helpText}</p>}
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <button onClick={() => setEditingQuestion({ ...q })} className="text-xs text-blue-600 hover:underline">Edytuj</button>
                            <button onClick={() => deleteQuestion(q.id)} className="text-xs text-red-600 hover:underline">Usuń</button>
                            <label className="flex items-center gap-1 cursor-pointer">
                              <input type="checkbox" checked={q.enabled} onChange={() => toggleEnabled(q)} className="w-4 h-4" />
                              <span className="text-xs text-gray-500">{q.enabled ? 'Wł.' : 'Wył.'}</span>
                            </label>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}

                  {addingTo === section.id ? (
                    <AddQuestionForm
                      newQ={newQ}
                      setNewQ={setNewQ}
                      onAdd={() => addQuestion(section.id)}
                      onCancel={() => setAddingTo(null)}
                    />
                  ) : (
                    <button
                      onClick={() => setAddingTo(section.id)}
                      className="mt-3 text-sm text-blue-600 hover:underline"
                    >
                      + Dodaj pytanie
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {tab === 'consents' && (
        <div className="space-y-3">
          {allConsents.length === 0 && (
            <p className="text-gray-500 text-center py-8">Brak zgód. Dodaj pytanie z typem CHECKBOX_CONSENT w odpowiedniej sekcji.</p>
          )}
          {allConsents.map((c) => (
            <div key={c.id} className={`bg-white rounded-lg shadow border p-4 ${!c.enabled ? 'opacity-50' : ''}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <p className="font-medium text-sm">{c.label}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{c.fieldKey}</p>
                  {c.consentText && (
                    <p className="text-sm text-gray-600 mt-2 bg-gray-50 p-3 rounded">{c.consentText}</p>
                  )}
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    <span className="px-1.5 py-0.5 bg-yellow-50 text-yellow-700 rounded text-xs">{showWhenLabel(c.showWhen)}</span>
                    {c.required && <span className="px-1.5 py-0.5 bg-red-50 text-red-600 rounded text-xs">wymagane</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={() => { setEditingQuestion({ ...c }); setTab('sections'); }} className="text-xs text-blue-600 hover:underline">Edytuj</button>
                  <label className="flex items-center gap-1 cursor-pointer">
                    <input type="checkbox" checked={c.enabled} onChange={() => toggleEnabled(c)} className="w-4 h-4" />
                    <span className="text-xs text-gray-500">{c.enabled ? 'Wł.' : 'Wył.'}</span>
                  </label>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'istqb' && (
        <IstqbProductsEditor
          sections={sections}
          setSections={setSections}
          setError={setError}
          setSuccess={setSuccess}
        />
      )}
    </div>
  );
}

// --- ISTQB Products Editor ---

interface IstqbGroup {
  group: string;
  items: string[];
}

function IstqbProductsEditor({ sections, setSections, setError, setSuccess }: {
  sections: Section[];
  setSections: React.Dispatch<React.SetStateAction<Section[]>>;
  setError: (s: string) => void;
  setSuccess: (s: string) => void;
}) {
  // Find the istqbProducts question
  const istqbQuestion = sections.flatMap((s) => s.questions).find((q) => q.fieldKey === 'istqbProducts');

  const [groups, setGroups] = useState<IstqbGroup[]>([]);
  const [newGroupName, setNewGroupName] = useState('');
  const [newItemName, setNewItemName] = useState<Record<number, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (istqbQuestion?.options) {
      const opts = istqbQuestion.options;
      // Format 1: [{ group, items }] — already grouped array
      if (Array.isArray(opts) && opts.length > 0 && typeof opts[0] === 'object' && 'group' in (opts[0] as Record<string, unknown>)) {
        setGroups(opts as IstqbGroup[]);
      }
      // Format 2: { "Group Name": ["item1", "item2"] } — object with group keys (from seed)
      else if (!Array.isArray(opts) && typeof opts === 'object' && opts !== null) {
        const entries = Object.entries(opts as Record<string, string[]>);
        setGroups(entries.map(([group, items]) => ({ group, items })));
      }
      // Format 3: flat string array
      else if (Array.isArray(opts) && typeof opts[0] === 'string') {
        setGroups([{ group: 'Produkty', items: opts as string[] }]);
      }
    }
  }, [istqbQuestion]);

  const saveProducts = async () => {
    if (!istqbQuestion) return;
    setSaving(true);
    try {
      await api.put(`/admin/form/questions/${istqbQuestion.id}`, { options: groups });
      // Update local state
      setSections((prev) =>
        prev.map((s) => ({
          ...s,
          questions: s.questions.map((q) =>
            q.id === istqbQuestion.id ? { ...q, options: groups } : q,
          ),
        })),
      );
      setSuccess('Zapisano listę produktów ISTQB®');
      setTimeout(() => setSuccess(''), 3000);
    } catch {
      setError('Nie udało się zapisać produktów');
    } finally {
      setSaving(false);
    }
  };

  const addGroup = () => {
    if (!newGroupName.trim()) return;
    setGroups([...groups, { group: newGroupName.trim(), items: [] }]);
    setNewGroupName('');
  };

  const removeGroup = (idx: number) => {
    if (!confirm(`Usunąć grupę "${groups[idx].group}" i wszystkie jej produkty?`)) return;
    setGroups(groups.filter((_, i) => i !== idx));
  };

  const renameGroup = (idx: number, name: string) => {
    setGroups(groups.map((g, i) => (i === idx ? { ...g, group: name } : g)));
  };

  const addItem = (groupIdx: number) => {
    const name = (newItemName[groupIdx] || '').trim();
    if (!name) return;
    setGroups(groups.map((g, i) =>
      i === groupIdx ? { ...g, items: [...g.items, name] } : g,
    ));
    setNewItemName({ ...newItemName, [groupIdx]: '' });
  };

  const removeItem = (groupIdx: number, itemIdx: number) => {
    setGroups(groups.map((g, i) =>
      i === groupIdx ? { ...g, items: g.items.filter((_, j) => j !== itemIdx) } : g,
    ));
  };

  const renameItem = (groupIdx: number, itemIdx: number, name: string) => {
    setGroups(groups.map((g, i) =>
      i === groupIdx
        ? { ...g, items: g.items.map((item, j) => (j === itemIdx ? name : item)) }
        : g,
    ));
  };

  if (!istqbQuestion) {
    return (
      <div className="bg-white rounded-lg shadow p-6 text-center">
        <p className="text-gray-500">Nie znaleziono pytania z kluczem "istqbProducts".</p>
        <p className="text-sm text-gray-400 mt-1">Dodaj pytanie typu MULTI_SELECT z fieldKey "istqbProducts" w sekcji "O akredytacji".</p>
      </div>
    );
  }

  const totalProducts = groups.reduce((sum, g) => sum + g.items.length, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{groups.length} grup, {totalProducts} produktów łącznie</p>
        <button
          onClick={saveProducts}
          disabled={saving}
          className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? 'Zapisywanie...' : 'Zapisz listę produktów'}
        </button>
      </div>

      {groups.map((group, gi) => (
        <div key={gi} className="bg-white rounded-lg shadow border p-4">
          <div className="flex items-center gap-2 mb-3">
            <input
              value={group.group}
              onChange={(e) => renameGroup(gi, e.target.value)}
              className="font-semibold text-sm px-2 py-1 border rounded flex-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-xs text-gray-400">{group.items.length} produktów</span>
            <button onClick={() => removeGroup(gi)} className="text-xs text-red-600 hover:underline">Usuń grupę</button>
          </div>

          <div className="space-y-1 ml-4">
            {group.items.map((item, ii) => (
              <div key={ii} className="flex items-center gap-2">
                <span className="text-gray-300">•</span>
                <input
                  value={item}
                  onChange={(e) => renameItem(gi, ii, e.target.value)}
                  className="flex-1 text-sm px-2 py-1 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button onClick={() => removeItem(gi, ii)} className="text-xs text-red-500 hover:underline">×</button>
              </div>
            ))}

            <div className="flex items-center gap-2 mt-2">
              <span className="text-gray-300">+</span>
              <input
                value={newItemName[gi] || ''}
                onChange={(e) => setNewItemName({ ...newItemName, [gi]: e.target.value })}
                onKeyDown={(e) => e.key === 'Enter' && addItem(gi)}
                placeholder="Nowy produkt..."
                className="flex-1 text-sm px-2 py-1 border border-dashed rounded focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              <button onClick={() => addItem(gi)} className="text-xs text-green-600 hover:underline">Dodaj</button>
            </div>
          </div>
        </div>
      ))}

      {/* Add group */}
      <div className="bg-white rounded-lg shadow border border-dashed p-4">
        <div className="flex items-center gap-2">
          <input
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addGroup()}
            placeholder="Nowa grupa (np. Expert Level)..."
            className="flex-1 text-sm px-2 py-1 border rounded focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          <button onClick={addGroup} disabled={!newGroupName.trim()} className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 disabled:opacity-50">
            + Dodaj grupę
          </button>
        </div>
      </div>
    </div>
  );
}

// --- Sub-components ---

function QuestionEditForm({ question, onChange, onSave, onCancel }: {
  question: Question;
  onChange: (q: Question) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  const updateShowWhen = (key: string, value: unknown) => {
    const sw = { ...(question.showWhen || {}) };
    if (value === '' || value === null || (Array.isArray(value) && value.length === 0)) {
      delete sw[key];
    } else {
      sw[key] = value;
    }
    onChange({ ...question, showWhen: Object.keys(sw).length > 0 ? sw : null });
  };

  return (
    <div className="bg-blue-50 p-4 rounded-lg space-y-3 mt-2">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium mb-1">Etykieta</label>
          <input value={question.label} onChange={(e) => onChange({ ...question, label: e.target.value })}
            className="w-full px-2 py-1.5 border rounded text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">Typ</label>
          <select value={question.type} onChange={(e) => onChange({ ...question, type: e.target.value })}
            className="w-full px-2 py-1.5 border rounded text-sm">
            {FIELD_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium mb-1">Tekst pomocniczy</label>
        <input value={question.helpText || ''} onChange={(e) => onChange({ ...question, helpText: e.target.value })}
          className="w-full px-2 py-1.5 border rounded text-sm" />
      </div>
      {question.isConsent && (
        <div>
          <label className="block text-xs font-medium mb-1">Tekst zgody</label>
          <textarea value={question.consentText || ''} onChange={(e) => onChange({ ...question, consentText: e.target.value })}
            rows={3} className="w-full px-2 py-1.5 border rounded text-sm" />
        </div>
      )}
      <div>
        <label className="block text-xs font-medium mb-1">Opcje (JSON lub jedna na linię)</label>
        <textarea
          value={typeof question.options === 'string' ? question.options : JSON.stringify(question.options, null, 2) || ''}
          onChange={(e) => {
            try { onChange({ ...question, options: JSON.parse(e.target.value) }); } catch {
              onChange({ ...question, options: e.target.value });
            }
          }}
          rows={3} className="w-full px-2 py-1.5 border rounded text-sm font-mono" />
      </div>

      {/* showWhen editor */}
      <div className="border-t pt-3">
        <p className="text-xs font-medium mb-2">Warunki widoczności (showWhen)</p>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs mb-1">Typ zgłoszenia</label>
            <div className="space-y-1">
              {APP_TYPE_OPTIONS.map((opt) => {
                const current = (question.showWhen?.applicationType as string[]) || [];
                return (
                  <label key={opt} className="flex items-center gap-1 text-xs">
                    <input type="checkbox" checked={current.includes(opt)}
                      onChange={(e) => {
                        const next = e.target.checked ? [...current, opt] : current.filter((v) => v !== opt);
                        updateShowWhen('applicationType', next);
                      }} className="w-3 h-3" />
                    {opt}
                  </label>
                );
              })}
            </div>
          </div>
          <div>
            <label className="block text-xs mb-1">Typ podmiotu</label>
            <select value={(question.showWhen?.entityType as string) || ''}
              onChange={(e) => updateShowWhen('entityType', e.target.value || null)}
              className="w-full px-2 py-1 border rounded text-xs">
              <option value="">dowolny</option>
              {ENTITY_TYPE_OPTIONS.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          </div>
          <div>
            <label className="flex items-center gap-1 text-xs mt-4">
              <input type="checkbox" checked={!!question.showWhen?.multipleProducts}
                onChange={(e) => updateShowWhen('multipleProducts', e.target.checked || null)}
                className="w-3 h-3" />
              Wiele produktów
            </label>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <label className="flex items-center gap-1 text-xs">
          <input type="checkbox" checked={question.required} onChange={(e) => onChange({ ...question, required: e.target.checked })} className="w-3 h-3" />
          Wymagane
        </label>
        <label className="flex items-center gap-1 text-xs">
          <input type="checkbox" checked={question.isConsent} onChange={(e) => onChange({ ...question, isConsent: e.target.checked, type: e.target.checked ? 'CHECKBOX_CONSENT' : question.type })} className="w-3 h-3" />
          Zgoda
        </label>
      </div>

      <div className="flex gap-2">
        <button onClick={onSave} className="px-3 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">Zapisz</button>
        <button onClick={onCancel} className="px-3 py-1.5 border rounded text-sm hover:bg-gray-50">Anuluj</button>
      </div>
    </div>
  );
}

function AddQuestionForm({ newQ, setNewQ, onAdd, onCancel }: {
  newQ: { fieldKey: string; label: string; helpText: string; type: string; required: boolean; isConsent: boolean; consentText: string; options: string; showWhenAppType: string[]; showWhenEntity: string; showWhenMultiProducts: boolean };
  setNewQ: (q: typeof newQ) => void;
  onAdd: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="mt-3 bg-green-50 p-4 rounded-lg space-y-3">
      <p className="text-sm font-medium">Nowe pytanie</p>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium mb-1">Klucz (fieldKey)</label>
          <input value={newQ.fieldKey} onChange={(e) => setNewQ({ ...newQ, fieldKey: e.target.value })}
            placeholder="np. myNewField" className="w-full px-2 py-1.5 border rounded text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">Typ</label>
          <select value={newQ.isConsent ? 'CHECKBOX_CONSENT' : newQ.type}
            onChange={(e) => {
              const isC = e.target.value === 'CHECKBOX_CONSENT';
              setNewQ({ ...newQ, type: e.target.value, isConsent: isC });
            }}
            className="w-full px-2 py-1.5 border rounded text-sm">
            {FIELD_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium mb-1">Etykieta</label>
        <input value={newQ.label} onChange={(e) => setNewQ({ ...newQ, label: e.target.value })}
          className="w-full px-2 py-1.5 border rounded text-sm" />
      </div>
      {newQ.isConsent && (
        <div>
          <label className="block text-xs font-medium mb-1">Tekst zgody</label>
          <textarea value={newQ.consentText} onChange={(e) => setNewQ({ ...newQ, consentText: e.target.value })}
            rows={3} className="w-full px-2 py-1.5 border rounded text-sm" />
        </div>
      )}
      <div>
        <label className="block text-xs font-medium mb-1">Opcje (jedna na linię lub JSON)</label>
        <textarea value={newQ.options} onChange={(e) => setNewQ({ ...newQ, options: e.target.value })}
          rows={2} className="w-full px-2 py-1.5 border rounded text-sm font-mono" placeholder='np. opcja1&#10;opcja2' />
      </div>

      {/* showWhen */}
      <div className="border-t pt-3">
        <p className="text-xs font-medium mb-2">Warunki widoczności</p>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs mb-1">Typ zgłoszenia</label>
            {APP_TYPE_OPTIONS.map((opt) => (
              <label key={opt} className="flex items-center gap-1 text-xs">
                <input type="checkbox" checked={newQ.showWhenAppType.includes(opt)}
                  onChange={(e) => {
                    const next = e.target.checked ? [...newQ.showWhenAppType, opt] : newQ.showWhenAppType.filter((v) => v !== opt);
                    setNewQ({ ...newQ, showWhenAppType: next });
                  }} className="w-3 h-3" />
                {opt}
              </label>
            ))}
          </div>
          <div>
            <label className="block text-xs mb-1">Typ podmiotu</label>
            <select value={newQ.showWhenEntity} onChange={(e) => setNewQ({ ...newQ, showWhenEntity: e.target.value })}
              className="w-full px-2 py-1 border rounded text-xs">
              <option value="">dowolny</option>
              {ENTITY_TYPE_OPTIONS.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          </div>
          <label className="flex items-center gap-1 text-xs mt-4">
            <input type="checkbox" checked={newQ.showWhenMultiProducts}
              onChange={(e) => setNewQ({ ...newQ, showWhenMultiProducts: e.target.checked })} className="w-3 h-3" />
            Wiele produktów
          </label>
        </div>
      </div>

      <label className="flex items-center gap-1 text-xs">
        <input type="checkbox" checked={newQ.required} onChange={(e) => setNewQ({ ...newQ, required: e.target.checked })} className="w-3 h-3" />
        Wymagane
      </label>

      <div className="flex gap-2">
        <button onClick={onAdd} disabled={!newQ.fieldKey || !newQ.label}
          className="px-3 py-1.5 bg-green-600 text-white rounded text-sm hover:bg-green-700 disabled:opacity-50">Dodaj</button>
        <button onClick={onCancel} className="px-3 py-1.5 border rounded text-sm hover:bg-gray-50">Anuluj</button>
      </div>
    </div>
  );
}
