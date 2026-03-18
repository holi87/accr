import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';

const SETTING_LABELS: Record<string, string> = {
  confirm_page_text: 'Tekst strony potwierdzenia',
  gmail_credentials: 'Gmail API — credentials (JSON)',
  gmail_sender: 'Gmail — adres nadawcy',
  notification_emails: 'Emaile powiadomień (JSON array)',
  email_template_confirmation: 'Szablon emaila potwierdzenia (JSON)',
  email_template_notification: 'Szablon emaila powiadomienia (JSON)',
  logo_path: 'Ścieżka do logo',
};

interface SettingEntry {
  key: string;
  value: string;
}

export default function Settings() {
  const navigate = useNavigate();
  const [settings, setSettings] = useState<SettingEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState<string | null>(null);
  const [success, setSuccess] = useState('');
  const [logoUploading, setLogoUploading] = useState(false);

  useEffect(() => {
    api
      .get<{ settings: Record<string, string> }>('/admin/settings')
      .then((data) => {
        // API returns { settings: { key: value, ... } } — convert to array
        const entries = Object.entries(data.settings).map(([key, value]) => ({ key, value }));
        setSettings(entries);
      })
      .catch((err) => {
        if (err?.status === 401) {
          navigate('/admin/login');
          return;
        }
        setError('Nie udało się pobrać ustawień');
      })
      .finally(() => setLoading(false));
  }, [navigate]);

  const handleSave = async (key: string, value: string) => {
    setSaving(key);
    setError('');
    setSuccess('');
    try {
      await api.put(`/admin/settings/${key}`, { value });
      setSuccess(`Zapisano: ${SETTING_LABELS[key] || key}`);
      setTimeout(() => setSuccess(''), 3000);
    } catch {
      setError(`Nie udało się zapisać ustawienia`);
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
      setSuccess('Logo zostało zaktualizowane');
      setTimeout(() => setSuccess(''), 3000);
    } catch {
      setError('Nie udało się przesłać logo');
    } finally {
      setLogoUploading(false);
    }
  };

  const updateSettingValue = (key: string, value: string) => {
    setSettings((prev) => prev.map((s) => (s.key === key ? { ...s, value } : s)));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Ustawienia</h1>

      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 rounded text-sm">{error}</div>
      )}
      {success && (
        <div className="mb-4 p-3 bg-green-50 text-green-700 rounded text-sm">{success}</div>
      )}

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Ustawienia ogólne</h2>
        <div className="space-y-4">
          {settings
            .filter((s) => s.key !== 'logo_path')
            .map((setting) => (
              <div key={setting.key}>
                <label className="block text-sm font-medium mb-1">
                  {SETTING_LABELS[setting.key] || setting.key}
                </label>
                <div className="flex gap-2">
                  {setting.value.length > 100 ? (
                    <textarea
                      value={setting.value}
                      onChange={(e) => updateSettingValue(setting.key, e.target.value)}
                      rows={4}
                      className="flex-1 px-3 py-2 border rounded-md text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  ) : (
                    <input
                      type="text"
                      value={setting.value}
                      onChange={(e) => updateSettingValue(setting.key, e.target.value)}
                      className="flex-1 px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  )}
                  <button
                    onClick={() => handleSave(setting.key, setting.value)}
                    disabled={saving === setting.key}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 disabled:opacity-50 self-start"
                  >
                    {saving === setting.key ? '...' : 'Zapisz'}
                  </button>
                </div>
              </div>
            ))}
          {settings.length === 0 && (
            <p className="text-gray-500 text-sm">Brak ustawień do wyświetlenia</p>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Logo</h2>
        <p className="text-sm text-gray-500 mb-3">
          Prześlij logo organizacji (PNG, JPG, SVG, max 2MB).
        </p>
        <input
          type="file"
          accept=".png,.jpg,.jpeg,.svg"
          onChange={handleLogoUpload}
          disabled={logoUploading}
          className="text-sm"
        />
        {logoUploading && (
          <p className="text-sm text-gray-500 mt-2">Przesyłanie...</p>
        )}
      </div>
    </div>
  );
}
