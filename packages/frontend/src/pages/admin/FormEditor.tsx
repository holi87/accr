import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';

interface Question {
  id: string;
  label: string;
  type: string;
  required: boolean;
  enabled: boolean;
}

interface Section {
  id: string;
  label: string;
  questions: Question[];
}

export default function FormEditor() {
  const navigate = useNavigate();
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openSections, setOpenSections] = useState<Set<string>>(new Set());

  useEffect(() => {
    api
      .get<{ sections: Section[] }>('/admin/form/sections')
      .then((data) => setSections(data.sections))
      .catch((err) => {
        if (err?.status === 401) {
          navigate('/admin/login');
          return;
        }
        setError('Nie udało się pobrać konfiguracji formularza');
      })
      .finally(() => setLoading(false));
  }, [navigate]);

  const toggleSection = (sectionId: string) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  };

  const toggleQuestion = async (questionId: string, enabled: boolean) => {
    try {
      await api.put(`/admin/form/questions/${questionId}`, { enabled });
      setSections((prev) =>
        prev.map((s) => ({
          ...s,
          questions: s.questions.map((q) =>
            q.id === questionId ? { ...q, enabled } : q,
          ),
        })),
      );
    } catch {
      setError('Nie udało się zaktualizować pytania');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (error && sections.length === 0) {
    return <div className="p-6 text-red-600">{error}</div>;
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Edytor formularza</h1>

      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 rounded text-sm">{error}</div>
      )}

      <div className="space-y-3">
        {sections.map((section) => (
          <div key={section.id} className="bg-white rounded-lg shadow border">
            <button
              onClick={() => toggleSection(section.id)}
              className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50"
            >
              <span className="font-medium">{section.label}</span>
              <span className="text-gray-400 text-sm">
                {section.questions.length} pytań &middot;{' '}
                {openSections.has(section.id) ? '\u25B2' : '\u25BC'}
              </span>
            </button>

            {openSections.has(section.id) && (
              <div className="border-t px-4 pb-4">
                {section.questions.length === 0 ? (
                  <p className="text-gray-500 text-sm py-3">Brak pytań w tej sekcji</p>
                ) : (
                  <div className="divide-y">
                    {section.questions.map((q) => (
                      <div
                        key={q.id}
                        className="flex items-center justify-between py-3 gap-4"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm truncate">{q.label}</p>
                          <div className="flex gap-2 mt-1">
                            <span className="px-1.5 py-0.5 bg-gray-100 rounded text-xs text-gray-600">
                              {q.type}
                            </span>
                            {q.required && (
                              <span className="px-1.5 py-0.5 bg-red-50 text-red-600 rounded text-xs">
                                wymagane
                              </span>
                            )}
                          </div>
                        </div>

                        <label className="flex items-center gap-2 cursor-pointer shrink-0">
                          <span className="text-xs text-gray-500">
                            {q.enabled ? 'Aktywne' : 'Wyłączone'}
                          </span>
                          <input
                            type="checkbox"
                            checked={q.enabled}
                            onChange={(e) => toggleQuestion(q.id, e.target.checked)}
                            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                        </label>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

        {sections.length === 0 && (
          <p className="text-gray-500 text-center py-12">Brak sekcji formularza</p>
        )}
      </div>
    </div>
  );
}
