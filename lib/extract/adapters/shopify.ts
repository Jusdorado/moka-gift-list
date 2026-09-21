import { throttleFor } from '../fetch';

export type ShopifyJsData = {
  name: string | null;
  priceCents: number | null;
  image: string | null;
  available: boolean;
};

export type ShopifyJsResult =
  | { kind: 'ok'; data: ShopifyJsData }
  | { kind: 'not_found' }
  | { kind: 'error' };

const KNOWN_SHOPIFY_HOSTS = [
  'coldcultureworldwide.com',
  'neweracap.eu',
  'latiendadelasgorras.com',
  'gng.la',
];

export function isKnownShopifyHost(url: string): boolean {
  try {
    const host = new URL(url).hostname;
    return KNOWN_SHOPIFY_HOSTS.some(h => host === h || host.endsWith('.' + h));
  } catch {
    return false;
  }
}

export function htmlLooksLikeShopify(html: string): boolean {
  return html.includes('cdn/shop') || html.includes('Shopify');
}

// Intenta <url sin query>.js — endpoint JSON de Shopify con title, price en
// céntimos y featured_image. Un 404 en el .js significa producto muerto, no
// "falló el endpoint": se distingue para no raspar la home como si fuera el
// producto.
export async function fetchShopifyJs(url: string, deadline?: number): Promise<ShopifyJsResult> {
  let jsUrl: string;
  try {
    const u = new URL(url);
    u.search = '';
    if (u.pathname.endsWith('.js')) jsUrl = u.href;
    else jsUrl = u.href.replace(/\/$/, '') + '.js';
  } catch {
    return { kind: 'error' };
  }
  try {
    const hardLimit = deadline ?? Date.now() + 45000;
    const queued = await Promise.race([
      throttleFor(jsUrl).then(() => true),
      new Promise<false>(r => setTimeout(() => r(false), Math.max(0, hardLimit - Date.now()))),
    ]);
    if (!queued) return { kind: 'error' };
    const res = await fetch(jsUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
      },
      signal: AbortSignal.timeout(Math.min(12000, Math.max(1000, hardLimit - Date.now()))),
    });
    if (res.status === 404 || res.status === 410) return { kind: 'not_found' };
    if (!res.ok) return { kind: 'error' };
    const data = await res.json();
    if (!data || typeof data !== 'object' || !data.title) return { kind: 'error' };
    let image: string | null = null;
    const img = data.featured_image || data.image;
    if (typeof img === 'string' && img) {
      image = img.startsWith('//') ? 'https:' + img : img;
    }
    return {
      kind: 'ok',
      data: {
        name: typeof data.title === 'string' ? data.title : null,
        priceCents: typeof data.price === 'number' ? data.price : null,
        image,
        available: data.available !== false,
      },
    };
  } catch {
    return { kind: 'error' };
  }
}
