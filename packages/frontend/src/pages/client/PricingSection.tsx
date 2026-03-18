import { useState, useEffect } from 'react';
import { api } from '@/lib/api';

interface PricingItem {
  name: string;
  price: number;
  currency: string;
  description?: string;
}

interface PricingData {
  items: PricingItem[];
  vatNote?: string;
}

export default function PricingSection() {
  const [pricing, setPricing] = useState<PricingData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<PricingData>('/form/pricing')
      .then(setPricing)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!pricing || !pricing.items || pricing.items.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
      <h2 className="text-xl font-semibold mb-4">Cennik</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-3 px-4 font-medium text-gray-700">Usługa</th>
              <th className="text-left py-3 px-4 font-medium text-gray-700">Opis</th>
              <th className="text-right py-3 px-4 font-medium text-gray-700">Cena</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {pricing.items.map((item, idx) => (
              <tr key={idx} className="hover:bg-gray-50">
                <td className="py-3 px-4 font-medium">{item.name}</td>
                <td className="py-3 px-4 text-gray-600">{item.description || '—'}</td>
                <td className="py-3 px-4 text-right font-semibold whitespace-nowrap">
                  {item.price.toLocaleString('pl-PL', { minimumFractionDigits: 2 })} {item.currency}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {pricing.vatNote && (
        <p className="text-xs text-gray-500 mt-4">{pricing.vatNote}</p>
      )}
    </div>
  );
}
