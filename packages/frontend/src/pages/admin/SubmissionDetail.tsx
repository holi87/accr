import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';

interface Note {
  id: string;
  content: string;
  authorName: string;
  createdAt: string;
}

interface EmailLog {
  id: string;
  subject: string;
  sentAt: string;
}

interface Consent {
  label: string;
  text: string;
  accepted: boolean;
}

interface AnswerSection {
  sectionLabel: string;
  answers: { label: string; value: string }[];
}

interface Submission {
  id: string;
  type: string;
  entityType: string;
  email: string;
  status: string;
  createdAt: string;
  sections: AnswerSection[];
  consents: Consent[];
  notes: Note[];
  emailLogs: EmailLog[];
}

const STATUSES = ['NOWE', 'W_TRAKCIE', 'ZAAKCEPTOWANE', 'ODRZUCONE'] as const;
const STATUS_LABELS: Record<string, string> = {
  NOWE: 'Nowe',
  W_TRAKCIE: 'W trakcie',
  ZAAKCEPTOWANE: 'Zaakceptowane',
  ODRZUCONE: 'Odrzucone',
};

export default function SubmissionDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [submission, setSubmission] = useState<Submission | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [statusUpdating, setStatusUpdating] = useState(false);
  const [noteContent, setNoteContent] = useState('');
  const [noteSubmitting, setNoteSubmitting] = useState(false);

  const [emailOpen, setEmailOpen] = useState(false);
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [emailSending, setEmailSending] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    api
      .get<Submission>(`/admin/submissions/${id}`)
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
    if (!id || statusUpdating) return;
    setStatusUpdating(true);
    try {
      await api.patch(`/admin/submissions/${id}/status`, { status: newStatus });
      setSubmission((prev) => (prev ? { ...prev, status: newStatus } : prev));
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
      const note = await api.post<Note>(`/admin/submissions/${id}/notes`, {
        content: noteContent,
      });
      setSubmission((prev) =>
        prev ? { ...prev, notes: [...prev.notes, note] } : prev,
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
      const log = await api.post<EmailLog>(`/admin/submissions/${id}/email`, {
        subject: emailSubject,
        body: emailBody,
      });
      setSubmission((prev) =>
        prev ? { ...prev, emailLogs: [...prev.emailLogs, log] } : prev,
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
            <h1 className="text-xl font-bold">Zgłoszenie #{submission.id.slice(0, 8)}</h1>
            <div className="flex flex-wrap gap-2 mt-2">
              <span className="px-2 py-1 bg-gray-100 rounded text-xs">{submission.type}</span>
              <span className="px-2 py-1 bg-gray-100 rounded text-xs">
                {submission.entityType}
              </span>
              <span className="text-xs text-gray-500">
                {new Date(submission.createdAt).toLocaleString('pl-PL')}
              </span>
            </div>
            <p className="text-sm text-gray-600 mt-1">{submission.email}</p>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
            <select
              value={submission.status}
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
      </div>

      {/* Answers by section */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Odpowiedzi</h2>
        {submission.sections.map((section, i) => (
          <div key={i} className="mb-6 last:mb-0">
            <h3 className="font-medium text-sm text-gray-700 border-b pb-2 mb-3">
              {section.sectionLabel}
            </h3>
            <dl className="space-y-2">
              {section.answers.map((a, j) => (
                <div key={j} className="grid grid-cols-3 gap-2 text-sm">
                  <dt className="text-gray-500">{a.label}</dt>
                  <dd className="col-span-2">{a.value || '—'}</dd>
                </div>
              ))}
            </dl>
          </div>
        ))}
        {submission.sections.length === 0 && (
          <p className="text-gray-500 text-sm">Brak odpowiedzi</p>
        )}
      </div>

      {/* Consents */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Zgody</h2>
        {submission.consents.map((c, i) => (
          <div key={i} className="flex items-start gap-3 mb-3 last:mb-0">
            <span className="text-lg">{c.accepted ? '\u2705' : '\u274C'}</span>
            <div>
              <p className="text-sm font-medium">{c.label}</p>
              <p className="text-xs text-gray-500 mt-0.5">{c.text}</p>
            </div>
          </div>
        ))}
        {submission.consents.length === 0 && (
          <p className="text-gray-500 text-sm">Brak zgód</p>
        )}
      </div>

      {/* Notes */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Notatki</h2>
        {submission.notes.length > 0 ? (
          <div className="space-y-3 mb-4">
            {submission.notes.map((note) => (
              <div key={note.id} className="p-3 bg-gray-50 rounded text-sm">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>{note.authorName}</span>
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

        {submission.emailLogs.length > 0 ? (
          <div className="space-y-2">
            {submission.emailLogs.map((log) => (
              <div key={log.id} className="flex justify-between items-center p-3 bg-gray-50 rounded text-sm">
                <span>{log.subject}</span>
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
