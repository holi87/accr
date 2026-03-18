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

interface Props {
  applicationType: string[];
  entityType: string;
  language: string;
  accreditationType: string;
  productCount: number;
}

function formatPLN(value: number): string {
  return value.toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' z\u0142';
}

export interface CostLineItem {
  label: string;
  unitPrice: number;
  quantity: number;
  subtotal: number;
}

export function calculateCost(
  pricing: PricingData,
  applicationType: string[],
  language: string,
  accreditationType: string,
  productCount: number
): { lines: CostLineItem[]; totalNet: number; vatAmount: number; totalGross: number; vatRate: number } {
  const lines: CostLineItem[] = [];
  const count = Math.max(productCount, 1);

  const hasMaterialy = applicationType.some(
    (t) => t.toLowerCase().includes('materia') || t === 'materialy'
  );
  const hasDostawca = applicationType.some(
    (t) => t.toLowerCase().includes('dostawc') || t === 'dostawca'
  );

  if (hasMaterialy) {
    const isCross = accreditationType.toLowerCase().includes('cross');
    if (!isCross) {
      const lang = language.toLowerCase();
      const isEn = lang.includes('ang') || lang === 'en' || lang === 'english';
      const itemId = isEn ? 'akredytacja_en' : 'akredytacja_pl';
      const item = pricing.items.find((i) => i.id === itemId);
      if (item) {
        lines.push({
          label: item.service,
          unitPrice: item.priceNet,
          quantity: count,
          subtotal: item.priceNet * count,
        });
      }
    } else {
      lines.push({
        label: 'Crossakredytacja materia\u0142u',
        unitPrice: 0,
        quantity: count,
        subtotal: 0,
      });
    }
  }

  if (hasDostawca) {
    const utrzymanie = pricing.items.find((i) => i.id === 'utrzymanie_dostawcy');
    if (utrzymanie) {
      lines.push({
        label: utrzymanie.service,
        unitPrice: utrzymanie.priceNet,
        quantity: 1,
        subtotal: utrzymanie.priceNet,
      });
    }

    const materialDostawca = pricing.items.find((i) => i.id === 'material_dostawca');
    if (materialDostawca) {
      lines.push({
        label: materialDostawca.service,
        unitPrice: materialDostawca.priceNet,
        quantity: count,
        subtotal: materialDostawca.priceNet * count,
      });
    }
  }

  const totalNet = lines.reduce((sum, l) => sum + l.subtotal, 0);
  const vatRate = pricing.vatRate;
  const vatAmount = Math.round(totalNet * (vatRate / 100) * 100) / 100;
  const totalGross = totalNet + vatAmount;

  return { lines, totalNet, vatAmount, totalGross, vatRate };
}

export default function CostEstimate({ applicationType, language, accreditationType, productCount }: Props) {
  const [pricing, setPricing] = useState<PricingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get<PricingData>('/form/pricing')
      .then(setPricing)
      .catch(() => setError('Nie uda\u0142o si\u0119 pobra\u0107 cennika'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (error || !pricing) {
    return error ? <p className="text-sm text-red-500">{error}</p> : null;
  }

  const { lines, totalNet, vatAmount, totalGross, vatRate } = calculateCost(
    pricing,
    applicationType,
    language,
    accreditationType,
    productCount
  );

  if (lines.length === 0) return null;

  return (
    <div className="border rounded-lg p-4 mt-6 bg-blue-50">
      <h3 className="font-semibold text-lg mb-3">Szacunkowa kalkulacja koszt\u00f3w</h3>

      <table className="w-full text-sm mb-4">
        <thead>
          <tr className="border-b border-blue-200">
            <th className="text-left py-2 font-medium text-gray-700">Pozycja</th>
            <th className="text-right py-2 font-medium text-gray-700">Cena jedn. netto</th>
            <th className="text-right py-2 font-medium text-gray-700">Ilo\u015b\u0107</th>
            <th className="text-right py-2 font-medium text-gray-700">Kwota netto</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-blue-100">
          {lines.map((line, idx) => (
            <tr key={idx}>
              <td className="py-2">{line.label}</td>
              <td className="py-2 text-right">{formatPLN(line.unitPrice)}</td>
              <td className="py-2 text-right">{line.quantity}</td>
              <td className="py-2 text-right font-medium">{formatPLN(line.subtotal)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot className="border-t-2 border-blue-300">
          <tr>
            <td colSpan={3} className="py-2 text-right font-medium">Razem netto:</td>
            <td className="py-2 text-right font-semibold">{formatPLN(totalNet)}</td>
          </tr>
          <tr>
            <td colSpan={3} className="py-1 text-right text-gray-600">VAT ({vatRate}%):</td>
            <td className="py-1 text-right text-gray-600">{formatPLN(vatAmount)}</td>
          </tr>
          <tr>
            <td colSpan={3} className="py-2 text-right font-bold">Razem brutto:</td>
            <td className="py-2 text-right font-bold text-lg">{formatPLN(totalGross)}</td>
          </tr>
        </tfoot>
      </table>

      <p className="text-xs text-gray-500 italic">
        Szacunkowa kalkulacja &mdash; ostateczna kwota zostanie potwierdzona przez SJSI
      </p>
    </div>
  );
}
