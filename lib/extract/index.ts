import * as cheerio from 'cheerio';
import type { Candidate } from './candidates';
import { pickBest, resolveImageUrl } from './candidates';
import { fetchPage } from './fetch';
import { parseJsonLdBlocks, selectProductNode, type JsonLdNode } from './jsonld';
import { formatPrice, parseMoney } from './price';
import type { Confidence, Currency, FieldResult, ProductExtraction } from './types';
import { extractAmazon } from './adapters/amazon';
import { extractThomann } from './adapters/thomann';
import { extractIdealo } from './adapters/idealo';
import { collectGenericPriceCandidates } from './adapters/generic';
import { fetchShopifyJs, htmlLooksLikeShopify, isKnownShopifyHost } from './adapters/shopify';

export type { Confidence, Currency, ExtractionStatus, FieldResult, ProductExtraction } from './types';
export { parseMoney, formatPrice, parseDisplayPrice } from './price';

const DOMAIN_NAME_SUFFIXES: [RegExp, RegExp][] = [
  [/thomann/i, /\s*[–—-]\s*Thomann.*$/i],
  [/amazon/i, /\s*[:|–—-]\s*Amazon\.[a-z.]+.*$/i],
  [/dji/i, /\s*[–—-]\s*DJI\s*(Store)?.*$/i],
  [/pccomponentes/i, /\s*[–—-]\s*Pccomponentes.*$/i],
  [/casadellibro/i, /\s*[–—-]\s*Casa del Libro.*$/i],
  [/idealo/i, /\s*[|•–—-]\s*idealo.*$/i],
  [/neweracap/i, /\s*[|–—-]\s*New Era.*$/i],
];

function cleanName(raw: string | null | undefined, url: string): string | null {
  if (!raw) return null;
  let name = raw.replace(/&amp;/g, '&').replace(/&#039;|&apos;/g, "'").replace(/&quot;/g, '"').replace(/\s+/g, ' ').trim();
  name = name.replace(/^(Comprar|Compra|Buy)\s+/i, '');
  for (const [domainRe, suffixRe] of DOMAIN_NAME_SUFFIXES) {
    if (domainRe.test(url)) name = name.replace(suffixRe, '').trim();
  }
  return name || null;
}

function emptyField(): FieldResult<string> {
  return { value: null, source: '', confidence: 'low' };
}

function emptyExtraction(status: ProductExtraction['status'], warnings: string[] = []): ProductExtraction {
  return {
    name: null, price: null, image: null,
    currency: null, priceAmount: null,
    fields: { name: emptyField(), price: emptyField(), image: emptyField() },
    status, warnings,
  };
}

function jsonLdImage(node: JsonLdNode): string | null {
  const img = node.image;
  if (typeof img === 'string') return img;
  if (Array.isArray(img)) {
    const first = img[0];
    if (typeof first === 'string') return first;
    if (first && typeof first === 'object' && typeof (first as JsonLdNode).url === 'string') return (first as JsonLdNode).url as string;
  }
  if (img && typeof img === 'object' && typeof (img as JsonLdNode).url === 'string') return (img as JsonLdNode).url as string;
  return null;
}

function jsonLdPrice(node: JsonLdNode): { raw: string | number; currency: string | null } | null {
  const offers = node.offers;
  const offerList = Array.isArray(offers) ? offers : offers ? [offers] : [];
  for (const offer of offerList) {
    if (!offer || typeof offer !== 'object') continue;
    const o = offer as JsonLdNode;
    const price = o.price ?? o.lowPrice;
    if (typeof price === 'number' || typeof price === 'string') {
      return { raw: price, currency: typeof o.priceCurrency === 'string' ? o.priceCurrency : null };
    }
  }
  if (typeof node.price === 'number' || typeof node.price === 'string') {
    return { raw: node.price, currency: typeof node.priceCurrency === 'string' ? node.priceCurrency : null };
  }
  return null;
}

// Hosts que son servicios de redirección/share, no páginas de producto.
const REDIRECT_HOSTS = ['share.google'];

// Techo duro para toda la extracción, cola de cortesía incluida. Queda por
// debajo de maxDuration=60 en Vercel.
const EXTRACTION_HARD_LIMIT_MS = 45000;

export async function extractProduct(url: string): Promise<ProductExtraction> {
  return extractProductInner(url, 0, Date.now() + EXTRACTION_HARD_LIMIT_MS);
}

async function extractProductInner(url: string, depth: number, deadline: number): Promise<ProductExtraction> {
  const warnings: string[] = [];

  // 1. Shopify .js primero para hosts conocidos
  let shopifyTried = false;
  if (isKnownShopifyHost(url)) {
    shopifyTried = true;
    const js = await fetchShopifyJs(url, deadline);
    if (js.kind === 'not_found') return emptyExtraction('not_found', warnings);
    if (js.kind === 'ok') return fromShopifyJs(js.data, url, warnings);
  }

  // 2. Fetch + clasificación
  const fetched = await fetchPage(url, deadline);
  if (fetched.status !== 'ok' || !fetched.html) {
    return emptyExtraction(fetched.status, warnings);
  }
  const html = fetched.html;

  // 3. Si el HTML indica Shopify y aún no probamos .js, probarlo
  if (!shopifyTried && htmlLooksLikeShopify(html)) {
    const js = await fetchShopifyJs(url, deadline);
    if (js.kind === 'not_found') return emptyExtraction('not_found', warnings);
    if (js.kind === 'ok') return fromShopifyJs(js.data, url, warnings);
  }

  const $ = cheerio.load(html);

  // 3b. Página de redirección/share: si el canonical apunta a otro host,
  // re-extraer una sola vez sobre la URL canónica. Si no se puede resolver,
  // mejor partial sin datos que datos inventados.
  const canonical = $('link[rel="canonical"]').attr('href');
  if (canonical) {
    try {
      if (new URL(canonical).hostname !== new URL(url).hostname && depth === 0) {
        const r = await extractProductInner(canonical, depth + 1, deadline);
        r.warnings.push('redirigido vía canonical');
        return r;
      }
    } catch {}
  }
  if (REDIRECT_HOSTS.some(h => new URL(url).hostname === h || new URL(url).hostname.endsWith('.' + h))) {
    return emptyExtraction('partial', warnings);
  }
  const jsonLdBlocks = parseJsonLdBlocks(html);
  const { product: productNode, webPage } = selectProductNode(jsonLdBlocks);

  const nameCandidates: Candidate[] = [];
  const priceCandidates: Candidate[] = [];
  const imageCandidates: Candidate[] = [];
  let jsonLdCurrency: string | null = null;
  const shopifyCurrency = html.match(/Shopify\.currency\s*=\s*{[^}]*"?(?:active|code)"?\s*:\s*"([A-Z]{3})"/)?.[1] ?? null;
  const metaCurrency: string | null =
    $('meta[property="og:price:currency"]').attr('content') ?? shopifyCurrency;

  // JSON-LD Product
  if (productNode) {
    const n = cleanName(typeof productNode.name === 'string' ? productNode.name : null, url);
    if (n) nameCandidates.push({ value: n, source: 'jsonld-product', confidence: 'high' });
    const p = jsonLdPrice(productNode);
    if (p) {
      jsonLdCurrency = p.currency;
      priceCandidates.push({ value: String(p.raw), source: 'jsonld-product', confidence: 'high' });
    }
    const img = resolveImageUrl(jsonLdImage(productNode) ?? '', url);
    if (img) imageCandidates.push({ value: img, source: 'jsonld-product', confidence: 'high' });
  } else if (webPage && typeof webPage.name === 'string') {
    const n = cleanName(webPage.name, url);
    if (n) nameCandidates.push({ value: n, source: 'jsonld-webpage', confidence: 'low' });
  }

  // Microdata (solo dentro del scope itemtype Product/Book/IndividualProduct,
  // excluyendo breadcrumbs e itemListElement)
  const mdScope = $('[itemscope][itemtype*="Product" i], [itemscope][itemtype*="Book" i]').first();
  const mdRoot = mdScope.length ? mdScope : null;
  const mdNameEl = mdRoot
    ? mdRoot.find('[itemprop="name"]').filter((_, el) => $(el).closest('[itemtype*="BreadcrumbList" i], [itemprop="itemListElement"]').length === 0).first()
    : $();
  const mdName = mdNameEl.text().trim() || mdNameEl.attr('content') || '';
  const mdNameClean = cleanName(mdName, url);
  if (mdNameClean) nameCandidates.push({ value: mdNameClean, source: 'microdata', confidence: 'medium' });
  const mdPrice = mdRoot ? (mdRoot.find('[itemprop="price"]').first().attr('content') ||
    mdRoot.find('[itemprop="price"]').first().text().trim()) : '';
  if (mdPrice) priceCandidates.push({ value: mdPrice, source: 'microdata', confidence: 'medium' });
  const mdImage = mdRoot ? (mdRoot.find('[itemprop="image"]').first().attr('content') ||
    mdRoot.find('[itemprop="image"]').first().attr('src') || '') : '';
  {
    const img = resolveImageUrl(mdImage, url);
    if (img) imageCandidates.push({ value: img, source: 'microdata', confidence: 'medium' });
  }

  // OG / Twitter
  const ogTitle = $('meta[property="og:title"]').attr('content');
  if (ogTitle) {
    const n = cleanName(ogTitle, url);
    if (n) nameCandidates.push({ value: n, source: 'og', confidence: 'medium' });
  }
  const ogImage = $('meta[property="og:image"]').attr('content');
  if (ogImage) {
    const img = resolveImageUrl(ogImage, url);
    if (img) imageCandidates.push({ value: img, source: 'og', confidence: 'medium' });
  }
  const ogPrice = $('meta[property="og:price:amount"]').attr('content');
  if (ogPrice) priceCandidates.push({ value: ogPrice, source: 'og', confidence: 'medium' });
  const twTitle = $('meta[name="twitter:title"]').attr('content');
  if (twTitle) {
    const n = cleanName(twTitle, url);
    if (n) nameCandidates.push({ value: n, source: 'twitter', confidence: 'medium' });
  }
  const twImage = $('meta[name="twitter:image"]').attr('content');
  if (twImage) {
    const img = resolveImageUrl(twImage, url);
    if (img) imageCandidates.push({ value: img, source: 'twitter', confidence: 'medium' });
  }

  // Adapters por dominio
  const host = new URL(url).hostname;
  if (host.includes('amazon')) {
    const r = extractAmazon($);
    const n = cleanName(r.name, url);
    if (n) nameCandidates.push({ value: n, source: 'dom:amazon', confidence: 'medium' });
    if (r.price) priceCandidates.push({ value: r.price, source: 'dom:amazon', confidence: 'medium' });
    if (r.image) {
      const img = resolveImageUrl(r.image, url);
      if (img) imageCandidates.push({ value: img, source: 'dom:amazon', confidence: 'medium' });
    }
  } else if (host.includes('thomann')) {
    const r = extractThomann($, html);
    if (r.price) priceCandidates.push({ value: r.price, source: 'dom:thomann', confidence: 'medium' });
    const n = cleanName(r.name, url);
    if (n) nameCandidates.push({ value: n, source: 'dom:thomann', confidence: 'medium' });
  } else if (host.includes('idealo')) {
    const r = extractIdealo($, html);
    if (r.price) priceCandidates.push({ value: r.price, source: 'dom:idealo', confidence: 'medium' });
    const n = cleanName(r.name, url);
    if (n) nameCandidates.push({ value: n, source: 'dom:idealo', confidence: 'medium' });
  }

  // DOM genérico (solo precios)
  priceCandidates.push(...collectGenericPriceCandidates($, html));

  // <title>
  const title = $('title').first().text();
  if (title) {
    const n = cleanName(title, url);
    if (n) nameCandidates.push({ value: n, source: 'title', confidence: 'low' });
  }

  // Selección
  const bestName = pickBest(nameCandidates);
  const bestPriceRaw = pickBest(priceCandidates);
  const bestImage = pickBest(imageCandidates);

  let priceStr: string | null = null;
  let priceAmount: number | null = null;
  let currency: Currency | null = null;
  if (bestPriceRaw) {
    const parsed = parseMoney(bestPriceRaw.value, {
      source: bestPriceRaw.source,
      jsonLdCurrency,
      metaCurrency,
      url,
    });
    if (parsed) {
      priceAmount = parsed.amount;
      currency = parsed.currency;
      priceStr = formatPrice(parsed.amount, parsed.currency);
    }
  }

  const fields = {
    name: bestName ? { value: bestName.value, source: bestName.source, confidence: bestName.confidence } : emptyField(),
    price: bestPriceRaw && priceStr ? { value: priceStr, source: bestPriceRaw.source, confidence: bestPriceRaw.confidence } : emptyField(),
    image: bestImage ? { value: bestImage.value, source: bestImage.source, confidence: bestImage.confidence } : emptyField(),
  };

  const missing = ['name', 'price', 'image'].filter(k => !fields[k as keyof typeof fields].value);
  const status = missing.length === 0 ? 'ok' : 'partial';

  return {
    name: fields.name.value,
    price: fields.price.value,
    image: fields.image.value,
    currency,
    priceAmount,
    fields,
    status,
    warnings,
  };
}

function fromShopifyJs(
  js: { name: string | null; priceCents: number | null; image: string | null; available: boolean },
  url: string,
  warnings: string[]
): ProductExtraction {
  if (!js.available) warnings.push('producto agotado');

  const name = cleanName(js.name, url);
  let priceStr: string | null = null;
  let priceAmount: number | null = null;
  let currency: Currency | null = null;
  if (js.priceCents !== null) {
    const parsed = parseMoney(js.priceCents, { source: 'shopify-js', url });
    if (parsed) {
      priceAmount = parsed.amount;
      currency = parsed.currency;
      priceStr = formatPrice(parsed.amount, parsed.currency);
    }
  }
  const image = resolveImageUrl(js.image ?? '', url);

  const fields = {
    name: name ? { value: name, source: 'shopify-js', confidence: 'high' as Confidence } : emptyField(),
    price: priceStr ? { value: priceStr, source: 'shopify-js', confidence: 'high' as Confidence } : emptyField(),
    image: image ? { value: image, source: 'shopify-js', confidence: 'high' as Confidence } : emptyField(),
  };
  const missing = ['name', 'price', 'image'].filter(k => !fields[k as keyof typeof fields].value);

  return {
    name: fields.name.value,
    price: fields.price.value,
    image: fields.image.value,
    currency,
    priceAmount,
    fields,
    status: missing.length === 0 ? 'ok' : 'partial',
    warnings,
  };
}
