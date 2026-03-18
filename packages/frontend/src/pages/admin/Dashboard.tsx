import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';

interface Stats {
  total: number;
  byStatus: Record<string, number>;
  recentWeek: number;
}

const MAIN_STATUS_CONFIG = [
  { key: 'NOWE', label: 'Nowe zgłoszenie', color: 'bg-blue-100 text-blue-800 border-blue-200' },
  { key: 'OCZEKIWANIE_NA_POPRAWKI', label: 'Oczekiwanie na poprawki', color: 'bg-orange-100 text-orange-800 border-orange-200' },
  { key: 'ZAAKCEPTOWANE', label: 'Zaakceptowane', color: 'bg-green-100 text-green-800 border-green-200' },
  { key: 'ODRZUCONE', label: 'Odrzucone', color: 'bg-red-100 text-red-800 border-red-200' },
] as const;

const SECONDARY_STATUS_CONFIG = [
  { key: 'WERYFIKACJA_KOMPLETNOSCI', label: 'Weryfikacja kompletności', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  { key: 'OCZEKIWANIE_NA_PLATNOSC', label: 'Oczekiwanie na płatność', color: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
  { key: 'W_RECENZJI', label: 'W recenzji', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  { key: 'PONOWNA_RECENZJA', label: 'Ponowna recenzja', color: 'bg-purple-50 text-purple-700 border-purple-200' },
] as const;

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get<Stats>('/admin/submissions/stats')
      .then(setStats)
      .catch((err) => {
        if (err?.status === 401) {
          navigate('/admin/login');
          return;
        }
        setError('Nie udało się pobrać statystyk');
      })
      .finally(() => setLoading(false));
  }, [navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (error) {
    return <div className="p-6 text-red-600">{error}</div>;
  }

  if (!stats) return null;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Panel administracyjny</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="p-6 bg-white rounded-lg shadow border">
          <p className="text-sm text-gray-500">Wszystkie zgłoszenia</p>
          <p className="text-3xl font-bold mt-1">{stats.total}</p>
        </div>
        <div className="p-6 bg-white rounded-lg shadow border">
          <p className="text-sm text-gray-500">Ostatni tydzień</p>
          <p className="text-3xl font-bold mt-1">{stats.recentWeek}</p>
        </div>
      </div>

      <h2 className="text-lg font-semibold mb-4">Statusy zgłoszeń</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {MAIN_STATUS_CONFIG.map(({ key, label, color }) => (
          <button
            key={key}
            onClick={() => navigate(`/admin/submissions?status=${key}`)}
            className={`p-4 rounded-lg border text-left hover:shadow-md transition-shadow ${color}`}
          >
            <p className="text-sm font-medium">{label}</p>
            <p className="text-2xl font-bold mt-1">
              {stats.byStatus[key] ?? 0}
            </p>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {SECONDARY_STATUS_CONFIG.map(({ key, label, color }) => (
          <button
            key={key}
            onClick={() => navigate(`/admin/submissions?status=${key}`)}
            className={`p-3 rounded-lg border text-left hover:shadow-sm transition-shadow ${color}`}
          >
            <p className="text-xs font-medium">{label}</p>
            <p className="text-lg font-bold mt-0.5">
              {stats.byStatus[key] ?? 0}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}
