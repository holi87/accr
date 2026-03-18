import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';

interface ApiAnswer {
  id: number;
  value: string;
  question: {
    fieldKey: string;
    label: string;
    type: string;
    isConsent: boolean;
    consentText: string | null;
    sectionId: number;
  };
}

interface ApiNote {
  id: number;
  content: string;
  createdAt: string;
  author: { id: number; name: string };
}

interface ApiEmailLog {
  id: number;
  subject: string;
  toAddress: string;
  status: string;
  sentAt: string;
}

interface StatusHistoryEntry {
  fromStatus: string | null;
  toStatus: string;
  comment: string | null;
  createdAt: string;
}

interface ApiSubmission {
  id: number;
  applicationType: string[];
  entityType: string;
  status: string;
  trackingToken?: string;
  iterationCount?: number;
  createdAt: string;
  updatedAt?: string;
  answers: ApiAnswer[];
  notes: ApiNote[];
  emails: ApiEmailLog[];
  statusHistory?: StatusHistoryEntry[];
}

const STATUSES = [
  'NOWE',
  'WERYFIKACJA_KOMPLETNOSCI',
  'OCZEKIWANIE_NA_PLATNOSC',
  'W_RECENZJI',
  'OCZEKIWANIE_NA_POPRAWKI',
  'PONOWNA_RECENZJA',
  'ZAAKCEPTOWANE',
  'ODRZUCONE',
] as const;

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

function formatType(applicationType: string[]): string {
  return applicationType
    .map((t) => {
      const l = t.toLowerCase();
      if (l.includes('materiał') || l.includes('material') || l === 'materialy') return 'Materiały';
      if (l.includes('dostawc') || l === 'dostawca') return 'Dostawca';
      return t;
    })
    .join(' + ');
}

export default function SubmissionDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [submission, setSubmission] = useState<ApiSubmission | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [pendingStatus, setPendingStatus] = useState('');
  const [statusComment, setStatusComment] = useState('');
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [noteContent, setNoteContent] = useState('');
  const [noteSubmitting, setNoteSubmitting] = useState(false);

  const [emailOpen, setEmailOpen] = useState(false);
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [emailSending, setEmailSending] = useState(false);

  const [tokenCopied, setTokenCopied] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    api
      .get<ApiSubmission>(`/admin/submissions/${id}`)
      .then(setSubmission)
      .catch((err) => {
        if (err?.status === 401) {
          navigate('/admin/login');
          return;
        }
        setError('Nie udało się pobrać zgłoszenia');
      })
      .finally(() => setLoading(false));
  }, [id, navigate]);

  const handleStatusChange = async (newStatus: string) => {
    setPendingStatus(newStatus);
    setStatusComment('');
  };

  const confirmStatusChange = async () => {
    if (!id || statusUpdating || !pendingStatus) return;
    setStatusUpdating(true);
    try {
      await api.patch(`/admin/submissions/${id}/status`, {
        status: pendingStatus,
        comment: statusComment || undefined,
      });
      setSubmission((prev) => (prev ? { ...prev, status: pendingStatus } : prev));
      setPendingStatus('');
      setStatusComment('');
      // Refresh to get updated statusHistory
      const updated = await api.get<ApiSubmission>(`/admin/submissions/${id}`);
      setSubmission(updated);
    } catch {
      setError('Nie udało się zmienić statusu');
    } finally {
      setStatusUpdating(false);
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !noteContent.trim() || noteSubmitting) return;
    setNoteSubmitting(true);
    try {
      const note = await api.post<ApiNote>(`/admin/submissions/${id}/notes`, {
        content: noteContent,
      });
      setSubmission((prev) =>
        prev ? { ...prev, notes: [note, ...prev.notes] } : prev,
      );
      setNoteContent('');
    } catch {
      setError('Nie udało się dodać notatki');
    } finally {
      setNoteSubmitting(false);
    }
  };

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || emailSending) return;
    setEmailSending(true);
    try {
      const log = await api.post<ApiEmailLog>(`/admin/submissions/${id}/email`, {
        subject: emailSubject,
        body: emailBody,
      });
      setSubmission((prev) =>
        prev ? { ...prev, emails: [log, ...prev.emails] } : prev,
      );
      setEmailSubject('');
      setEmailBody('');
      setEmailOpen(false);
    } catch {
      setError('Nie udało się wysłać emaila');
    } finally {
      setEmailSending(false);
    }
  };

  const copyTrackingLink = () => {
    if (!submission?.trackingToken) return;
    const url = `${window.location.origin}/track/${submission.trackingToken}`;
    navigator.clipboard.writeText(url).then(() => {
      setTokenCopied(true);
      setTimeout(() => setTokenCopied(false), 2000);
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (error && !submission) {
    return <div className="p-6 text-red-600">{error}</div>;
  }

  if (!submission) return null;

  const regularAnswers = (submission.answers || []).filter((a) => !a.question.isConsent);
  const consents = (submission.answers || []).filter((a) => a.question.isConsent);
  const emailAnswer = (submission.answers || []).find((a) => a.question.fieldKey === 'email');
  const applicantEmail = emailAnswer?.value || '—';

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <button
        onClick={() => navigate('/admin/submissions')}
        className="text-sm text-blue-600 hover:underline mb-4 inline-block"
      >
        &larr; Powrót do listy
      </button>

      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 rounded text-sm">{error}</div>
      )}

      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold">Zgłoszenie #{submission.id}</h1>
            <div className="flex flex-wrap gap-2 mt-2">
              <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                {formatType(submission.applicationType as string[])}
              </span>
              <span className="px-2 py-1 bg-gray-100 rounded text-xs">
                {submission.entityType === 'fizyczna' ? 'Osoba fizyczna' : 'Osoba prawna'}
              </span>
              <span className="text-xs text-gray-500">
                {new Date(submission.createdAt).toLocaleString('pl-PL')}
              </span>
            </div>
            <p className="text-sm text-gray-600 mt-1">{applicantEmail}</p>
            {(submission.iterationCount ?? 0) > 0 && (
              <p className="text-sm text-orange-600 mt-1 font-medium">
                Iteracja: {submission.iterationCount}
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
            <select
              value={pendingStatus || submission.status}
              onChange={(e) => handleStatusChange(e.target.value)}
              disabled={statusUpdating}
              className="px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Status change comment */}
        {pendingStatus && pendingStatus !== submission.status && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg border">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Komentarz do zmiany statusu (opcjonalny)
            </label>
            <textarea
              value={statusComment}
              onChange={(e) => setStatusComment(e.target.value)}
              rows={2}
              placeholder="Dodaj komentarz widoczny w historii zmian..."
              className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2"
            />
            <div className="flex gap-2">
              <button
                onClick={confirmStatusChange}
                disabled={statusUpdating}
                className="px-4 py-1.5 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 disabled:opacity-50"
              >
                {statusUpdating ? 'Zapisywanie...' : 'Zmień status'}
              </button>
              <button
                onClick={() => setPendingStatus('')}
                className="px-4 py-1.5 border rounded-md text-sm hover:bg-gray-50"
              >
                Anuluj
              </button>
            </div>
          </div>
        )}

        {/* Tracking token */}
        {submission.trackingToken && (
          <div className="mt-4 flex items-center gap-2 text-sm">
            <span className="text-gray-500">Link śledzenia:</span>
            <code className="bg-gray-100 px-2 py-1 rounded text-xs break-all">
              {window.location.origin}/track/{submission.trackingToken}
            </code>
            <button
              onClick={copyTrackingLink}
              className="text-blue-600 hover:text-blue-800 text-xs flex-shrink-0"
            >
              {tokenCopied ? 'Skopiowano!' : 'Kopiuj'}
            </button>
          </div>
        )}
      </div>

      {/* Status History */}
      {submission.statusHistory && submission.statusHistory.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Historia statusów</h2>
          <div className="relative">
            <div className="absolute left-3 top-2 bottom-2 w-0.5 bg-gray-200" />
            <div className="space-y-3">
              {submission.statusHistory.map((entry, idx) => (
                <div key={idx} className="relative flex gap-4 pl-8">
                  <div className="absolute left-1.5 top-1.5 w-3 h-3 rounded-full bg-blue-500 border-2 border-white" />
                  <div className="flex-1 pb-1">
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

      {/* Answers */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Odpowiedzi</h2>
        {regularAnswers.length > 0 ? (
          <dl className="space-y-3">
            {regularAnswers.map((a) => (
              <div key={a.id} className="grid grid-cols-3 gap-2 text-sm py-2 border-b border-gray-100 last:border-0">
                <dt className="text-gray-500">{a.question.label}</dt>
                <dd className="col-span-2 break-words">
                  {a.question.type === 'MULTI_SELECT' ? (() => {
                    try { return JSON.parse(a.value).join(', '); } catch { return a.value; }
                  })() : a.value || '—'}
                </dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className="text-gray-500 text-sm">Brak odpowiedzi</p>
        )}
      </div>

      {/* Consents */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Zgody</h2>
        {consents.length > 0 ? (
          <div className="space-y-3">
            {consents.map((c) => (
              <div key={c.id} className="flex items-start gap-3">
                <span className="text-lg flex-shrink-0">{c.value === 'true' ? '✅' : '❌'}</span>
                <div>
                  <p className="text-sm font-medium">{c.question.label}</p>
                  {c.question.consentText && (
                    <p className="text-xs text-gray-500 mt-0.5">{c.question.consentText}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-sm">Brak zgód</p>
        )}
      </div>

      {/* Notes */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Notatki</h2>
        {(submission.notes || []).length > 0 ? (
          <div className="space-y-3 mb-4">
            {submission.notes.map((note) => (
              <div key={note.id} className="p-3 bg-gray-50 rounded text-sm">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>{note.author.name}</span>
                  <span>{new Date(note.createdAt).toLocaleString('pl-PL')}</span>
                </div>
                <p>{note.content}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-sm mb-4">Brak notatek</p>
        )}

        <form onSubmit={handleAddNote} className="flex gap-2">
          <input
            type="text"
            placeholder="Dodaj notatkę..."
            value={noteContent}
            onChange={(e) => setNoteContent(e.target.value)}
            className="flex-1 px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={noteSubmitting || !noteContent.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 disabled:opacity-50"
          >
            Dodaj
          </button>
        </form>
      </div>

      {/* Email log & compose */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Korespondencja email</h2>
          <button
            onClick={() => setEmailOpen(!emailOpen)}
            className="px-3 py-1.5 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700"
          >
            {emailOpen ? 'Anuluj' : 'Napisz email'}
          </button>
        </div>

        {emailOpen && (
          <form onSubmit={handleSendEmail} className="mb-6 p-4 border rounded-lg space-y-3">
            <div>
              <label className="block text-sm font-medium mb-1">Do: {applicantEmail}</label>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Temat</label>
              <input
                type="text"
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                required
                className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Treść</label>
              <textarea
                value={emailBody}
                onChange={(e) => setEmailBody(e.target.value)}
                required
                rows={5}
                className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              type="submit"
              disabled={emailSending}
              className="px-4 py-2 bg-green-600 text-white rounded-md text-sm hover:bg-green-700 disabled:opacity-50"
            >
              {emailSending ? 'Wysyłanie...' : 'Wyślij email'}
            </button>
          </form>
        )}

        {(submission.emails || []).length > 0 ? (
          <div className="space-y-2">
            {submission.emails.map((log) => (
              <div key={log.id} className="flex justify-between items-center p-3 bg-gray-50 rounded text-sm">
                <div>
                  <span className="font-medium">{log.subject}</span>
                  <span className="text-xs text-gray-500 ml-2">&rarr; {log.toAddress}</span>
                </div>
                <span className="text-xs text-gray-500">
                  {new Date(log.sentAt).toLocaleString('pl-PL')}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-sm">Brak wysłanych wiadomości</p>
        )}
      </div>
    </div>
  );
}
