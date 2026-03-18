import { useParams, useNavigate, useLocation } from 'react-router-dom';

export default function ConfirmationPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as { confirmText?: string; trackingToken?: string } | null;
  const confirmText = state?.confirmText;
  const trackingToken = state?.trackingToken;

  const trackingUrl = trackingToken
    ? `${window.location.origin}/track/${trackingToken}`
    : null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white">
      <div className="max-w-2xl mx-auto px-4 py-16">
        <div className="bg-white rounded-xl shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Wniosek złożony</h1>
          {confirmText ? (
            <p className="text-gray-600 mb-6" dangerouslySetInnerHTML={{ __html: confirmText }} />
          ) : (
            <p className="text-gray-600 mb-6">
              Potwierdzamy złożenie wniosku o akredytację ISTQB®. Numer zgłoszenia: #{id}.
              O dalszych krokach poinformujemy drogą mailową.
            </p>
          )}

          {trackingUrl && (
            <div className="bg-blue-50 rounded-lg p-4 mb-6 text-left">
              <p className="text-sm font-medium text-blue-900 mb-2">
                Śledź status zgłoszenia:
              </p>
              <a
                href={trackingUrl}
                className="text-sm text-blue-600 hover:underline break-all"
              >
                {trackingUrl}
              </a>
              <p className="text-xs text-gray-500 mt-2">
                Zachowaj ten link — pozwala śledzić status wniosku bez logowania.
              </p>
            </div>
          )}

          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center px-6 py-2 bg-primary text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            Powrót do strony głównej
          </button>
        </div>
      </div>
    </div>
  );
}
