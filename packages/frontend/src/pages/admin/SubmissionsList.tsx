import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '@/lib/api';

interface Submission {
  id: string;
  type: string;
  entityType: string;
  email: string;
  status: string;
  createdAt: string;
}

interface SubmissionsResponse {
  submissions: Submission[];
  total: number;
  page: number;
  limit: number;
}

const STATUS_LABELS: Record<string, string> = {
  NOWE: 'Nowe',
  W_TRAKCIE: 'W trakcie',
  ZAAKCEPTOWANE: 'Zaakceptowane',
  ODRZUCONE: 'Odrzucone',
};

const STATUS_COLORS: Record<string, string> = {
  NOWE: 'bg-blue-100 text-blue-800',
  W_TRAKCIE: 'bg-yellow-100 text-yellow-800',
  ZAAKCEPTOWANE: 'bg-green-100 text-green-800',
  ODRZUCONE: 'bg-red-100 text-red-800',
};

export default function SubmissionsList() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [data, setData] = useState<SubmissionsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState(searchParams.get('search') || '');

  const page = Number(searchParams.get('page') || '1');
  const status = searchParams.get('status') || '';
  const limit = 20;

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', String(limit));
      if (status) params.set('status', status);
      if (search) params.set('search', search);
      const res = await api.get<SubmissionsResponse>(`/admin/submissions?${params}`);
      setData(res);
    } catch (err: unknown) {
      if ((err as { status?: number })?.status === 401) {
        navigate('/admin/login');
        return;
      }
      setError('Nie udało się pobrać zgłoszeń');
    } finally {
      setLoading(false);
    }
  }, [page, status, search, navigate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const totalPages = data ? Math.ceil(data.total / limit) : 0;

  const updateParam = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value) {
      next.set(key, value);
    } else {
      next.delete(key);
    }
    if (key !== 'page') next.set('page', '1');
    setSearchParams(next);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    updateParam('search', search);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Zgłoszenia</h1>

      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <form onSubmit={handleSearch} className="flex gap-2 flex-1">
          <input
            type="text"
            placeholder="Szukaj po email, nazwie..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Szukaj
          </button>
        </form>

        <select
          value={status}
          onChange={(e) => updateParam('status', e.target.value)}
          className="px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Wszystkie statusy</option>
          {Object.entries(STATUS_LABELS).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {error && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded text-sm">{error}</div>}

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : (
        <>
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left">
                <tr>
                  <th className="px-4 py-3 font-medium">ID</th>
                  <th className="px-4 py-3 font-medium">Typ</th>
                  <th className="px-4 py-3 font-medium">Podmiot</th>
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">Data</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {data?.submissions.map((s) => (
                  <tr
                    key={s.id}
                    onClick={() => navigate(`/admin/submissions/${s.id}`)}
                    className="hover:bg-gray-50 cursor-pointer"
                  >
                    <td className="px-4 py-3 font-mono text-xs">{s.id.slice(0, 8)}</td>
                    <td className="px-4 py-3">{s.type}</td>
                    <td className="px-4 py-3">{s.entityType}</td>
                    <td className="px-4 py-3">{s.email}</td>
                    <td className="px-4 py-3">
                      {new Date(s.createdAt).toLocaleDateString('pl-PL')}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[s.status] || 'bg-gray-100 text-gray-800'}`}
                      >
                        {STATUS_LABELS[s.status] || s.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {data?.submissions.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                      Brak zgłoszeń
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-gray-500">
                Strona {page} z {totalPages} (łącznie {data?.total})
              </p>
              <div className="flex gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => updateParam('page', String(page - 1))}
                  className="px-3 py-1 border rounded-md text-sm disabled:opacity-50 hover:bg-gray-50"
                >
                  Poprzednia
                </button>
                <button
                  disabled={page >= totalPages}
                  onClick={() => updateParam('page', String(page + 1))}
                  className="px-3 py-1 border rounded-md text-sm disabled:opacity-50 hover:bg-gray-50"
                >
                  Następna
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
