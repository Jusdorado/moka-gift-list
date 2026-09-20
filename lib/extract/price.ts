import type { Currency } from './types';

export type MoneyHints = {
  source?: string;
  jsonLdCurrency?: string | null;
  metaCurrency?: string | null;
  url?: string;
};

const VALID_CURRENCIES = new Set(['EUR', 'USD', 'GBP']);

function normalizeCurrency(raw: string | null | undefined): Currency | null {
  if (!raw) return null;
  const c = raw.trim().toUpperCase();
  return VALID_CURRENCIES.has(c) ? (c as Currency) : null;
}

function currencyFromSymbol(raw: string): Currency | null {
  if (raw.includes('€')) return 'EUR';
  if (raw.includes('£')) return 'GBP';
  if (raw.includes('$')) return 'USD';
  return null;
}

function currencyFromTld(url: string | undefined): Currency | null {
  if (!url) return null;
  try {
    const host = new URL(url).hostname;
    if (/\.(es|de|fr|it|eu|nl|pt|be|at|ie)$/.test(host)) return 'EUR';
  } catch {}
  return null;
}

// Parsea un precio consciente del formato: decide por el último separador.
// "2.999" -> 2999 (miles), "29,99" -> 29.99 (decimal), "1,299.00" -> 1299.
export function parseMoney(
  raw: string | number | null | undefined,
  hints: MoneyHints = {}
): { amount: number; currency: Currency | null } | null {
  if (raw === null || raw === undefined) return null;

  // Moneda: priceCurrency JSON-LD -> og:price:currency/Shopify.currency ->
  // símbolo -> TLD -> EUR por defecto (el formato de salida es EUR, así que el
  // campo no puede quedar null mientras se muestra €).
  const currency =
    normalizeCurrency(hints.jsonLdCurrency) ??
    normalizeCurrency(hints.metaCurrency) ??
    (typeof raw === 'string' ? currencyFromSymbol(raw) : null) ??
    currencyFromTld(hints.url) ??
    'EUR';

  if (typeof raw === 'number') {
    const amount = hints.source === 'shopify-js' ? raw / 100 : raw;
    if (!Number.isFinite(amount) || amount <= 0 || amount > 100000) return null;
    return { amount, currency };
  }

  let s = raw.replace(/&nbsp;| /g, ' ').replace(/[^\d.,\-]/g, '').trim();
  if (!s || !/\d/.test(s)) return null;
  s = s.replace(/-/g, '');

  const lastDot = s.lastIndexOf('.');
  const lastComma = s.lastIndexOf(',');
  const lastSep = Math.max(lastDot, lastComma);

  let amount: number;
  if (lastSep === -1) {
    amount = parseInt(s, 10);
  } else {
    const digitsAfter = s.length - lastSep - 1;
    if (digitsAfter === 3 && s.indexOf(s[lastSep]) === lastSep) {
      // separador seguido de exactamente 3 dígitos y único -> miles
      amount = parseInt(s.replace(/[.,]/g, ''), 10);
    } else if (digitsAfter === 3 && lastDot !== -1 && lastComma !== -1) {
      // hay ambos: el último es decimal
      amount = parseFloat(s[lastSep] === '.' ? s.replace(/,/g, '') : s.replace(/\./g, '').replace(',', '.'));
    } else if (digitsAfter <= 2) {
      // decimal
      amount = lastSep === lastDot
        ? parseFloat(s.replace(/,/g, ''))
        : parseFloat(s.replace(/\./g, '').replace(',', '.'));
    } else {
      // más de 3 dígitos tras el último separador: todo son miles
      amount = parseInt(s.replace(/[.,]/g, ''), 10);
    }
  }

  if (!Number.isFinite(amount) || amount <= 0 || amount > 100000) return null;
  return { amount, currency };
}

// Formatea para mostrar: EUR -> "2.999,00€", USD -> "$85.00", GBP -> "£85.00".
export function formatPrice(amount: number, currency: Currency | null): string {
  const fixed = amount.toFixed(2);
  if (currency === 'USD') return `$${fixed}`;
  if (currency === 'GBP') return `£${fixed}`;
  const [int, dec] = fixed.split('.');
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${grouped},${dec}€`;
}

// Parseo consciente de formato para strings ya formateados ("2.999,00€", "$85.00").
export function parseDisplayPrice(price: string | undefined | null): number {
  if (!price) return 0;
  const parsed = parseMoney(price);
  return parsed?.amount ?? 0;
}
