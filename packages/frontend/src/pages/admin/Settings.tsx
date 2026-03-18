import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';

interface EmailTemplate {
  enabled: boolean;
  subject: string;
  body: string;
}

interface NotificationTemplate {
  subject: string;
  body: string;
}

export default function Settings() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState<string | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);

  // Individual settings
  const [confirmText, setConfirmText] = useState('');
  const [gmailSender, setGmailSender] = useState('');
  const [gmailCredentials, setGmailCredentials] = useState('');
  const [notificationEmails, setNotificationEmails] = useState('');

  // Email templates (parsed from JSON)
  const [confirmTemplate, setConfirmTemplate] = useState<EmailTemplate>({ enabled: false, subject: '', body: '' });
  const [notifyTemplate, setNotifyTemplate] = useState<NotificationTemplate>({ subject: '', body: '' });

  useEffect(() => {
    api
      .get<{ settings: Record<string, string> }>('/admin/settings')
      .then((data) => {
        const s = data.settings;
        setConfirmText(s.confirm_page_text || '');
        setGmailSender(s.gmail_sender || '');
        setGmailCredentials(s.gmail_credentials || '');
        setNotificationEmails(s.notification_emails ? tryFormatEmails(s.notification_emails) : '');

        if (s.email_template_confirmation) {
          try { setConfirmTemplate(JSON.parse(s.email_template_confirmation)); } catch { /* */ }
        }
        if (s.email_template_notification) {
          try { setNotifyTemplate(JSON.parse(s.email_template_notification)); } catch { /* */ }
        }
      })
      .catch((err) => {
        if (err?.status === 401) { navigate('/admin/login'); return; }
        if (err?.status === 403) { setError('Brak uprawnień — wymagana rola ADMIN'); return; }
        setError('Nie udało się pobrać ustawień');
      })
      .finally(() => setLoading(false));
  }, [navigate]);

  const save = async (key: string, value: string) => {
    setSaving(key);
    setError('');
    try {
      await api.put(`/admin/settings/${key}`, { value });
      setSuccess('Zapisano');
      setTimeout(() => setSuccess(''), 3000);
    } catch {
      setError('Nie udało się zapisać');
    } finally {
      setSaving(null);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoUploading(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('logo', file);
      await api.upload('/admin/settings/logo', formData);
      setSuccess('Logo zaktualizowane');
      setTimeout(() => setSuccess(''), 3000);
    } catch {
      setError('Nie udało się przesłać logo');
    } finally {
      setLogoUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Ustawienia</h1>

      {error && <div className="p-3 bg-red-50 text-red-700 rounded text-sm">{error}</div>}
      {success && <div className="p-3 bg-green-50 text-green-700 rounded text-sm">{success}</div>}

      {/* Logo */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-3">Logo organizacji</h2>
        <p className="text-sm text-gray-500 mb-3">PNG, JPG lub SVG, max 2MB. Wyświetlane w formularzu i emailach.</p>
        <input type="file" accept=".png,.jpg,.jpeg,.svg" onChange={handleLogoUpload} disabled={logoUploading} className="text-sm" />
        {logoUploading && <p className="text-sm text-gray-500 mt-2">Przesyłanie...</p>}
      </div>

      {/* Confirmation page text */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-3">Tekst strony potwierdzenia</h2>
        <p className="text-xs text-gray-500 mb-2">Wyświetlany po złożeniu wniosku. Dostępne zmienne: {'{{numer}}'}</p>
        <textarea
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          rows={4}
          className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={() => save('confirm_page_text', confirmText)}
          disabled={saving === 'confirm_page_text'}
          className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 disabled:opacity-50"
        >
          {saving === 'confirm_page_text' ? 'Zapisywanie...' : 'Zapisz'}
        </button>
      </div>

      {/* Email confirmation template */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Szablon emaila — potwierdzenie</h2>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={confirmTemplate.enabled}
              onChange={(e) => setConfirmTemplate({ ...confirmTemplate, enabled: e.target.checked })}
              className="w-4 h-4"
            />
            <span className="text-sm">{confirmTemplate.enabled ? 'Włączony' : 'Wyłączony'}</span>
          </label>
        </div>
        <p className="text-xs text-gray-500 mb-3">
          Wysyłany do zgłaszającego po złożeniu wniosku. Zmienne: {'{{imie}}'}, {'{{email}}'}, {'{{firma}}'}, {'{{typ_zgloszenia}}'}, {'{{produkty_istqb}}'}, {'{{data}}'}, {'{{numer}}'}
        </p>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">Temat</label>
            <input
              value={confirmTemplate.subject}
              onChange={(e) => setConfirmTemplate({ ...confirmTemplate, subject: e.target.value })}
              placeholder="np. Potwierdzenie złożenia wniosku #{{numer}}"
              className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Treść</label>
            <textarea
              value={confirmTemplate.body}
              onChange={(e) => setConfirmTemplate({ ...confirmTemplate, body: e.target.value })}
              rows={6}
              placeholder="Szanowni Państwo, potwierdzamy złożenie wniosku..."
              className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        <button
          onClick={() => save('email_template_confirmation', JSON.stringify(confirmTemplate))}
          disabled={saving === 'email_template_confirmation'}
          className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 disabled:opacity-50"
        >
          {saving === 'email_template_confirmation' ? 'Zapisywanie...' : 'Zapisz szablon'}
        </button>
      </div>

      {/* Email notification template */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-3">Szablon emaila — powiadomienie wewnętrzne</h2>
        <p className="text-xs text-gray-500 mb-3">
          Wysyłany do administratorów po wpłynięciu nowego wniosku. Zmienne: {'{{numer}}'}, {'{{typ}}'}, {'{{podmiot}}'}
        </p>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">Temat</label>
            <input
              value={notifyTemplate.subject}
              onChange={(e) => setNotifyTemplate({ ...notifyTemplate, subject: e.target.value })}
              className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Treść</label>
            <textarea
              value={notifyTemplate.body}
              onChange={(e) => setNotifyTemplate({ ...notifyTemplate, body: e.target.value })}
              rows={5}
              className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        <button
          onClick={() => save('email_template_notification', JSON.stringify(notifyTemplate))}
          disabled={saving === 'email_template_notification'}
          className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 disabled:opacity-50"
        >
          {saving === 'email_template_notification' ? 'Zapisywanie...' : 'Zapisz szablon'}
        </button>
      </div>

      {/* Gmail configuration */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-3">Konfiguracja Gmail API</h2>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">Adres nadawcy</label>
            <div className="flex gap-2">
              <input
                value={gmailSender}
                onChange={(e) => setGmailSender(e.target.value)}
                placeholder="akredytacje@sjsi.org"
                className="flex-1 px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button onClick={() => save('gmail_sender', gmailSender)} disabled={saving === 'gmail_sender'}
                className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 disabled:opacity-50">
                Zapisz
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Credentials (JSON klucza serwisowego)</label>
            <textarea
              value={gmailCredentials}
              onChange={(e) => setGmailCredentials(e.target.value)}
              rows={4}
              placeholder='{"type": "service_account", ...}'
              className="w-full px-3 py-2 border rounded-md text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button onClick={() => save('gmail_credentials', gmailCredentials)} disabled={saving === 'gmail_credentials'}
              className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 disabled:opacity-50">
              Zapisz credentials
            </button>
          </div>
        </div>
      </div>

      {/* Notification emails */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-3">Emaile powiadomień</h2>
        <p className="text-xs text-gray-500 mb-2">Adresy email które otrzymają powiadomienie o nowym wniosku. Jeden adres na linię.</p>
        <textarea
          value={notificationEmails}
          onChange={(e) => setNotificationEmails(e.target.value)}
          rows={3}
          placeholder="admin1@sjsi.org&#10;admin2@sjsi.org"
          className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={() => {
            const emails = notificationEmails.split('\n').map((e) => e.trim()).filter(Boolean);
            save('notification_emails', JSON.stringify(emails));
          }}
          disabled={saving === 'notification_emails'}
          className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 disabled:opacity-50"
        >
          Zapisz
        </button>
      </div>
    </div>
  );
}

function tryFormatEmails(json: string): string {
  try {
    const arr = JSON.parse(json);
    if (Array.isArray(arr)) return arr.join('\n');
  } catch { /* */ }
  return json;
}
