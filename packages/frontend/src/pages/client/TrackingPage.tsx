import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';

interface StatusHistoryEntry {
  fromStatus: string | null;
  toStatus: string;
  comment: string | null;
  createdAt: string;
}

interface TrackingData {
  id: number;
  status: string;
  iterationCount: number;
  createdAt: string;
  updatedAt: string;
  statusHistory: StatusHistoryEntry[];
}

const STATUS_LABELS: Record<string, string> = {
  NOWE: 'Nowe zgłoszenie',
  WERYFIKACJA_KOMPLETNOSCI: 'Weryfikacja kompletności',
  OCZEKIWANIE_NA_PLATNOSC: 'Oczekiwanie na płatność',
  W_RECENZJI: 'W recenzji',
  OCZEKIWANIE_NA_POPRAWKI: 'Oczekiwanie na poprawki',
  PONOWNA_RECENZJA: 'Ponowna recenzja',
  ZAAKCEPTOWANE: 'Zaakceptowane',
  ODRZUCONE: 'Odrzucone',
};

const STATUS_COLORS: Record<string, string> = {
  NOWE: 'bg-blue-100 text-blue-800',
  WERYFIKACJA_KOMPLETNOSCI: 'bg-blue-100 text-blue-800',
  OCZEKIWANIE_NA_PLATNOSC: 'bg-yellow-100 text-yellow-800',
  W_RECENZJI: 'bg-purple-100 text-purple-800',
  OCZEKIWANIE_NA_POPRAWKI: 'bg-orange-100 text-orange-800',
  PONOWNA_RECENZJA: 'bg-purple-100 text-purple-800',
  ZAAKCEPTOWANE: 'bg-green-100 text-green-800',
  ODRZUCONE: 'bg-red-100 text-red-800',
};

function formatStatusLabel(status: string, iterationCount: number): string {
  const label = STATUS_LABELS[status] || status;
  if (status === 'OCZEKIWANIE_NA_POPRAWKI' && iterationCount > 0) {
    return `${label} (iteracja ${iterationCount})`;
  }
  return status === 'ZAAKCEPTOWANE' ? `${label} ✅` : label;
}

export default function TrackingPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<TrackingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!token) return;
    api
      .get<TrackingData>(`/form/track/${token}`)
      .then(setData)
      .catch((err) => {
        if (err?.status === 404) {
          setNotFound(true);
        }
      })
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md mx-auto px-4 text-center">
          <div className="bg-white rounded-xl shadow-lg p-8">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">Nie znaleziono zgłoszenia</h1>
            <p className="text-gray-600 mb-6">
              Podany link śledzenia jest nieprawidłowy lub wygasł. Sprawdź, czy skopiowano pełny adres URL.
            </p>
            <button
              onClick={() => navigate('/')}
              className="inline-flex items-center px-6 py-2 bg-primary text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              Strona główna
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-12">
        <h1 className="text-2xl font-bold text-center mb-8">Status zgłoszenia</h1>

        {/* Summary card */}
        <div className="bg-white rounded-xl shadow p-6 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <div>
              <p className="text-sm text-gray-500">Numer zgłoszenia</p>
              <p className="text-lg font-bold">#{data.id}</p>
            </div>
            <span
              className={`inline-block px-3 py-1.5 rounded-full text-sm font-medium ${STATUS_COLORS[data.status] || 'bg-gray-100 text-gray-800'}`}
            >
              {formatStatusLabel(data.status, data.iterationCount)}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-500">Data złożenia</p>
              <p className="font-medium">{new Date(data.createdAt).toLocaleDateString('pl-PL')}</p>
            </div>
            <div>
              <p className="text-gray-500">Ostatnia aktualizacja</p>
              <p className="font-medium">{new Date(data.updatedAt).toLocaleDateString('pl-PL')}</p>
            </div>
            {data.iterationCount > 0 && (
              <div>
                <p className="text-gray-500">Liczba iteracji</p>
                <p className="font-medium">{data.iterationCount}</p>
              </div>
            )}
          </div>
        </div>

        {/* Status history timeline */}
        {data.statusHistory && data.statusHistory.length > 0 && (
          <div className="bg-white rounded-xl shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Historia statusów</h2>
            <div className="relative">
              <div className="absolute left-3 top-2 bottom-2 w-0.5 bg-gray-200" />
              <div className="space-y-4">
                {data.statusHistory.map((entry, idx) => (
                  <div key={idx} className="relative flex gap-4 pl-8">
                    <div className="absolute left-1.5 top-1.5 w-3 h-3 rounded-full bg-primary border-2 border-white" />
                    <div className="flex-1 pb-2">
                      <div className="flex flex-wrap items-center gap-2 text-sm">
                        {entry.fromStatus && (
                          <>
                            <span className="text-gray-500">
                              {STATUS_LABELS[entry.fromStatus] || entry.fromStatus}
                            </span>
                            <span className="text-gray-400">&rarr;</span>
                          </>
                        )}
                        <span className="font-medium">
                          {STATUS_LABELS[entry.toStatus] || entry.toStatus}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {new Date(entry.createdAt).toLocaleString('pl-PL')}
                      </p>
                      {entry.comment && (
                        <p className="text-sm text-gray-600 mt-1 bg-gray-50 rounded p-2">
                          {entry.comment}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="text-center mt-8">
          <button
            onClick={() => navigate('/')}
            className="text-sm text-primary hover:underline"
          >
            Powrót do strony głównej
          </button>
        </div>
      </div>
    </div>
  );
}
