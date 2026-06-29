// Helpers for displaying and parsing money. Internally everything is stored as
// integer cents to avoid floating-point rounding errors. Currency is per-studio
// and passed in explicitly.

const CURRENCY_SYMBOLS: Record<string, string> = {
  eur: "€",
  usd: "$",
  gbp: "£",
};

export function currencySymbol(currency: string): string {
  return CURRENCY_SYMBOLS[currency.toLowerCase()] ?? currency.toUpperCase() + " ";
}

// (2500, "eur") -> "€25.00"
export function formatMoney(cents: number, currency: string): string {
  const amount = (cents / 100).toFixed(2);
  return `${currencySymbol(currency)}${amount}`;
}

// "25" or "25.50" -> 2500 / 2550. Returns null if not a valid amount.
export function parsePriceToCents(input: string): number | null {
  const cleaned = input.trim().replace(/[^0-9.]/g, "");
  if (cleaned === "") return null;
  const value = Number(cleaned);
  if (!Number.isFinite(value) || value < 0) return null;
  return Math.round(value * 100);
}
