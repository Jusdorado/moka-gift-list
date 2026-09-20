import type { Confidence } from './types';

export type Candidate = {
  value: string;
  source: string;
  confidence: Confidence;
  penalty?: number;
};

// Prioridad de source: adapter/shopify > jsonld-product > microdata > og/twitter > dom > title.
const SOURCE_PRIORITY: Record<string, number> = {
  'shopify-js': 0,
  'jsonld-product': 1,
  'microdata': 2,
  'og': 3,
  'twitter': 4,
  'jsonld-webpage': 6,
  'title': 7,
};

function sourcePriority(source: string): number {
  if (source in SOURCE_PRIORITY) return SOURCE_PRIORITY[source];
  if (source.startsWith('dom:')) return 5;
  return 8;
}

export function pickBest(candidates: Candidate[]): Candidate | null {
  const valid = candidates.filter(c => c.value);
  if (valid.length === 0) return null;
  valid.sort((a, b) => {
    const pa = sourcePriority(a.source) + (a.penalty ?? 0);
    const pb = sourcePriority(b.source) + (b.penalty ?? 0);
    return pa - pb;
  });
  return valid[0];
}

const PRICE_DISCOUNT_CONTEXT = /envío|envio|desde|ahorra|ahorro|PVP|antes|\/mes|al mes|shipping|was /i;
const STRIKETHROUGH_OPEN = /<(del|s)\b|class="[^"]*(strikethrough|was-price|compare-at)[^"]*"/i;
const STRIKETHROUGH_CLOSE = /<\/(del|s)>/i;

// Penaliza candidatos de precio cuyo contexto (~80 chars) sugiera envío, "desde",
// ahorro o precio tachado.
export function priceContextPenalty(html: string, matchIndex: number, matchLength: number): number {
  const start = Math.max(0, matchIndex - 80);
  const end = Math.min(html.length, matchIndex + matchLength + 80);
  const ctx = html.slice(start, end);
  if (PRICE_DISCOUNT_CONTEXT.test(ctx)) return 3;
  // dentro de <del>/<s>/strikethrough abierto antes del match y no cerrado
  const before = html.slice(Math.max(0, matchIndex - 500), matchIndex);
  const lastOpen = before.search(STRIKETHROUGH_OPEN);
  if (lastOpen !== -1 && !STRIKETHROUGH_CLOSE.test(before.slice(lastOpen))) return 3;
  return 0;
}

const BAD_IMAGE_RE = /logo|icon|sprite|placeholder|1x1|blank/i;

export function isBadImage(url: string): boolean {
  return BAD_IMAGE_RE.test(url);
}

// Upgrade a alta resolución de Amazon: "._AC_SL1500_." etc.
export function upgradeAmazonImage(url: string): string {
  if (!/media-amazon\.com|ssl-images-amazon\.com/.test(url)) return url;
  return url.replace(/\._.*?_\./, '.');
}

export function resolveImageUrl(url: string, baseUrl: string): string | null {
  if (!url) return null;
  let u = url.replace(/&amp;/g, '&').trim();
  if (u.startsWith('//')) u = 'https:' + u;
  else if (u.startsWith('/')) {
    try { u = new URL(u, baseUrl).href; } catch { return null; }
  }
  if (!u.startsWith('http')) return null;
  if (isBadImage(u)) return null;
  return upgradeAmazonImage(u);
}
