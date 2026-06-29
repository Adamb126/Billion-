// Invoice calculations + formatting. All money is in integer cents.

export type LineItemLike = {
  description: string;
  quantity: number;
  unitPriceCents: number;
  vatRate: number; // percent
};

export type InvoiceTotals = {
  subtotalCents: number; // sum of line nets
  vatCents: number; // sum of line VAT
  totalCents: number; // subtotal + VAT
  // VAT broken down by rate, for the invoice summary (e.g. "VAT @ 23%").
  vatByRate: { rate: number; netCents: number; vatCents: number }[];
};

// Net (ex-VAT) amount for a single line.
export function lineNetCents(item: LineItemLike): number {
  return Math.round(item.quantity * item.unitPriceCents);
}

export function lineVatCents(item: LineItemLike): number {
  return Math.round((lineNetCents(item) * item.vatRate) / 100);
}

export function computeTotals(items: LineItemLike[]): InvoiceTotals {
  let subtotalCents = 0;
  let vatCents = 0;
  const byRate = new Map<number, { netCents: number; vatCents: number }>();

  for (const item of items) {
    const net = lineNetCents(item);
    const vat = lineVatCents(item);
    subtotalCents += net;
    vatCents += vat;
    const existing = byRate.get(item.vatRate) ?? { netCents: 0, vatCents: 0 };
    existing.netCents += net;
    existing.vatCents += vat;
    byRate.set(item.vatRate, existing);
  }

  const vatByRate = [...byRate.entries()]
    .map(([rate, v]) => ({ rate, ...v }))
    .sort((a, b) => a.rate - b.rate);

  return {
    subtotalCents,
    vatCents,
    totalCents: subtotalCents + vatCents,
    vatByRate,
  };
}

// 1 -> "INV-0001"
export function formatInvoiceNumber(n: number): string {
  return `INV-${String(n).padStart(4, "0")}`;
}

// Common Ireland VAT rates offered in the invoice form (free to type others).
export const VAT_RATES = [0, 9, 13.5, 23];
