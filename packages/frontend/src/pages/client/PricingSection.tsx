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
  const [open, setOpen] = useState(false);

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
              {item.priceNet === 0 ? 'bezpłatnie' : formatPLN(item.priceNet)}
            </td>
            <td className="py-3 px-4 text-gray-600">{item.perUnit}</td>
            <td className="py-3 px-4 text-gray-600">{item.validity}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  return (
    <div className="bg-white rounded-xl shadow-lg mb-8 overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-6 hover:bg-gray-50 transition-colors"
      >
        <h2 className="text-xl font-semibold">Cennik usług akredytacyjnych</h2>
        <svg
          className={`w-6 h-6 text-gray-500 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="px-6 pb-6 border-t border-gray-100 pt-4">
          {materialyItems.length > 0 && (
            <div className="mb-6">
              <h3 className="text-base font-medium text-gray-800 mb-2">Akredytacja materiałów szkoleniowych</h3>
              <div className="overflow-x-auto">{renderTable(materialyItems)}</div>
            </div>
          )}

          {dostawcaItems.length > 0 && (
            <div className="mb-6">
              <h3 className="text-base font-medium text-gray-800 mb-2">Akredytacja dostawcy szkoleń</h3>
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
      )}
    </div>
  );
}
