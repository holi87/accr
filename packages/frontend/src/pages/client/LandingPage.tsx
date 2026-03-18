import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';

export default function LandingPage() {
  const navigate = useNavigate();
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/settings/logo')
      .then((res) => {
        if (res.ok) return res.blob();
        return null;
      })
      .then((blob) => {
        if (blob) setLogoUrl(URL.createObjectURL(blob));
      })
      .catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <div className="max-w-3xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          {logoUrl && (
            <img src={logoUrl} alt="SJSI Logo" className="h-20 mx-auto mb-6" />
          )}
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Portal Akredytacji ISTQB®
          </h1>
          <p className="text-lg text-gray-600 mb-2">
            Stowarzyszenie Jakości Systemów Informatycznych
          </p>
          <p className="text-gray-500">
            Złóż wniosek o akredytację materiałów szkoleniowych lub akredytację dostawcy szkoleń ISTQB®.
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
          <h2 className="text-xl font-semibold mb-4">Jak to działa?</h2>
          <ol className="space-y-3 text-gray-600">
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-7 h-7 rounded-full bg-primary text-white text-sm flex items-center justify-center font-medium">1</span>
              <span>Wybierz rodzaj akredytacji i typ podmiotu</span>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-7 h-7 rounded-full bg-primary text-white text-sm flex items-center justify-center font-medium">2</span>
              <span>Uzupełnij dane zgłaszającego</span>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-7 h-7 rounded-full bg-primary text-white text-sm flex items-center justify-center font-medium">3</span>
              <span>Podaj informacje o akredytacji i wybierz produkty ISTQB®</span>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-7 h-7 rounded-full bg-primary text-white text-sm flex items-center justify-center font-medium">4</span>
              <span>Zaakceptuj wymagane zgody i oświadczenia</span>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-7 h-7 rounded-full bg-primary text-white text-sm flex items-center justify-center font-medium">5</span>
              <span>Przejrzyj i złóż wniosek</span>
            </li>
          </ol>
        </div>

        <div className="text-center">
          <button
            onClick={() => navigate('/form')}
            className="inline-flex items-center px-8 py-3 bg-primary text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors text-lg"
          >
            Złóż wniosek
          </button>
        </div>
      </div>
    </div>
  );
}
