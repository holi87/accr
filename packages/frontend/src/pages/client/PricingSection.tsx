import { useState, useEffect } from 'react';
import { api } from '@/lib/api';

interface PricingItem {
  id: string;
  service: string;
  priceNet: number;
  perUnit: string;
  validity: string;
  applicableTo: string;
}

interface PricingData {
  items: PricingItem[];
  vatRate: number;
  note: string;
}

function formatPLN(value: number): string {
  return value.toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' zł';
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

  const materialyItems = pricing.items.filter((i) => i.applicableTo === 'materialy');
  const dostawcaItems = pricing.items.filter((i) => i.applicableTo === 'dostawca');

  const renderTable = (items: PricingItem[]) => (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-gray-200">
          <th className="text-left py-3 px-4 font-medium text-gray-700">Usługa</th>
          <th className="text-right py-3 px-4 font-medium text-gray-700">Cena netto</th>
          <th className="text-left py-3 px-4 font-medium text-gray-700">Jednostka</th>
          <th className="text-left py-3 px-4 font-medium text-gray-700">Ważność</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-100">
        {items.map((item) => (
          <tr key={item.id} className="hover:bg-gray-50">
            <td className="py-3 px-4 font-medium">{item.service}</td>
            <td className="py-3 px-4 text-right font-semibold whitespace-nowrap">
              {formatPLN(item.priceNet)}
            </td>
            <td className="py-3 px-4 text-gray-600">{item.perUnit}</td>
            <td className="py-3 px-4 text-gray-600">{item.validity}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  return (
    <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
      <h2 className="text-xl font-semibold mb-6">Cennik</h2>

      {materialyItems.length > 0 && (
        <div className="mb-6">
          <h3 className="text-base font-medium text-gray-800 mb-2">Akredytacja materiałów</h3>
          <div className="overflow-x-auto">{renderTable(materialyItems)}</div>
        </div>
      )}

      {dostawcaItems.length > 0 && (
        <div className="mb-6">
          <h3 className="text-base font-medium text-gray-800 mb-2">Akredytacja dostawcy</h3>
          <div className="overflow-x-auto">{renderTable(dostawcaItems)}</div>
        </div>
      )}

      {pricing.note && (
        <p className="text-xs text-gray-500 mt-4">{pricing.note}</p>
      )}
      <p className="text-xs text-gray-500 mt-1">
        Wszystkie ceny netto. Do cen należy doliczyć VAT {pricing.vatRate}%.
      </p>
    </div>
  );
}
