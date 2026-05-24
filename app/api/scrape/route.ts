/* ─────────────────────────────────────────────────
   Product scraper – works across all major stores
   ───────────────────────────────────────────────── */

// ── helpers ──

function decode(s: string): string {
  return s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&#x27;/g, "'").replace(/&#x2F;/g, '/');
}

function cleanText(s: string | null): string | null {
  if (!s) return null;
  let text = decode(s).replace(/\s+/g, ' ').trim();
  // Remove leading emojis and special characters
  text = text.replace(/^[\u{1F300}-\u{1F9FF}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}\u{200D}\u{20E3}\u{E0020}-\u{E007F}]+\s*/gu, '');
  // Remove "Compra/Comprar el/la/los" prefixes
  text = text.replace(/^(?:Compra[r]?\s+(?:el|la|los|las)?\s*)/i, '');
  return text || null;
}

function toEuro(raw: string): string | null {
  const cleaned = raw.replace(/[^\d.,]/g, '');
  // Handle "1.299,00" (ES) → 1299.00
  let num: number;
  if (cleaned.includes(',') && cleaned.includes('.')) {
    // Determine format: last separator is decimal
    const lastComma = cleaned.lastIndexOf(',');
    const lastDot = cleaned.lastIndexOf('.');
    if (lastComma > lastDot) {
      num = parseFloat(cleaned.replace(/\./g, '').replace(',', '.'));
    } else {
      num = parseFloat(cleaned.replace(/,/g, ''));
    }
  } else if (cleaned.includes(',')) {
    num = parseFloat(cleaned.replace(',', '.'));
  } else {
    num = parseFloat(cleaned);
  }
  if (isNaN(num) || num <= 0 || num > 100000) return null;
  return num.toFixed(2).replace('.', ',') + '€';
}

function resolveUrl(src: string, baseUrl: string): string {
  try {
    if (src.startsWith('//')) return 'https:' + src;
    if (src.startsWith('/')) return new URL(src, baseUrl).href;
    if (src.startsWith('http')) return src;
    return new URL(src, baseUrl).href;
  } catch {
    return src;
  }
}

function getDomain(url: string): string {
  try { return new URL(url).hostname.replace('www.', ''); } catch { return ''; }
}

// ── JSON-LD parser (multiple blocks) ──

function parseAllJsonLd(html: string): Record<string, unknown>[] {
  const results: Record<string, unknown>[] = [];
  const re = /<script[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    try {
      const parsed = JSON.parse(m[1]);
      if (Array.isArray(parsed)) results.push(...parsed);
      else results.push(parsed);
    } catch { /* skip bad JSON */ }
  }
  return results;
}

function findInJsonLd(blocks: Record<string, unknown>[], key: string): unknown | null {
  for (const block of blocks) {
    if (block[key]) return block[key];
    // Check @graph
    const graph = block['@graph'] as Record<string, unknown>[] | undefined;
    if (Array.isArray(graph)) {
      for (const node of graph) {
        if (node[key]) return node[key];
      }
    }
  }
  return null;
}

// ── Meta tag extractor ──

function getMeta(html: string, property: string): string | null {
  // property="..." content="..."
  const r1 = new RegExp(`<meta[^>]*(?:property|name)=["']${property}["'][^>]*content=["']([^"']+)["']`, 'i');
  const m1 = html.match(r1);
  if (m1) return decode(m1[1]);
  // content="..." property="..." (reversed order)
  const r2 = new RegExp(`<meta[^>]*content=["']([^"']+)["'][^>]*(?:property|name)=["']${property}["']`, 'i');
  const m2 = html.match(r2);
  if (m2) return decode(m2[1]);
  return null;
}

// ── IMAGE extraction ──

function extractImage(html: string, url: string, domain: string, jsonLd: Record<string, unknown>[]): string | null {
  let img: string | null = null;

  // 1) JSON-LD image
  const ldImage = findInJsonLd(jsonLd, 'image');
  if (ldImage) {
    if (typeof ldImage === 'string') img = ldImage;
    else if (Array.isArray(ldImage) && ldImage.length > 0) img = String(ldImage[0]);
    else if (typeof ldImage === 'object' && ldImage !== null && 'url' in (ldImage as Record<string, unknown>)) img = String((ldImage as Record<string, string>).url);
  }

  // 2) OG / meta tags
  if (!img) img = getMeta(html, 'og:image');
  if (!img) img = getMeta(html, 'product:image');
  if (!img) img = getMeta(html, 'twitter:image');
  if (!img) img = getMeta(html, 'twitter:image:src');

  // 3) Amazon specific
  if (!img && domain.includes('amazon')) {
    const patterns = [
      /"hiRes"\s*:\s*"([^"]+)"/,
      /"large"\s*:\s*"([^"]+)"/,
      /data-old-hires="([^"]+)"/,
      /<img[^>]*id="landingImage"[^>]*src="([^"]+)"/,
      /<img[^>]*id="imgBlkFront"[^>]*src="([^"]+)"/,
      /<img[^>]*id="main-image"[^>]*src="([^"]+)"/,
    ];
    for (const p of patterns) {
      const m = html.match(p);
      if (m?.[1]) { img = m[1]; break; }
    }
  }

  // 4) Shopify stores (Cold Culture, GNG, New Era)
  if (!img && (domain.includes('coldculture') || domain.includes('gng.la') || domain.includes('neweracap') || html.includes('Shopify'))) {
    const patterns = [
      /"featured_image"\s*:\s*"([^"]+)"/,
      /"src"\s*:\s*"(\/\/cdn\.shopify[^"]+)"/,
      /<img[^>]*class="[^"]*product__media[^"]*"[^>]*src="([^"]+)"/i,
      /<img[^>]*class="[^"]*product-featured-media[^"]*"[^>]*src="([^"]+)"/i,
      /<img[^>]*class="[^"]*photoswipe__image[^"]*"[^>]*src="([^"]+)"/i,
      /data-zoom-image="([^"]+)"/,
    ];
    for (const p of patterns) {
      const m = html.match(p);
      if (m?.[1]) { img = m[1]; break; }
    }
  }

  // 5) Idealo
  if (!img && domain.includes('idealo')) {
    const patterns = [
      /<img[^>]*class="[^"]*datasheet-cover[^"]*"[^>]*src="([^"]+)"/i,
      /"image"\s*:\s*"(https:\/\/cdn\.idealo[^"]+)"/,
      /data-src="(https:\/\/cdn\.idealo[^"]+)"/,
    ];
    for (const p of patterns) {
      const m = html.match(p);
      if (m?.[1]) { img = m[1]; break; }
    }
  }

  // 6) Thomann
  if (!img && domain.includes('thomann')) {
    const patterns = [
      /<img[^>]*class="[^"]*product-image[^"]*"[^>]*src="([^"]+)"/i,
      /<img[^>]*id="mainProductImage"[^>]*src="([^"]+)"/i,
      /data-zoom="([^"]+)"/,
      /"image"\s*:\s*"(https:\/\/thumbs\.static-thomann[^"]+)"/,
    ];
    for (const p of patterns) {
      const m = html.match(p);
      if (m?.[1]) { img = m[1]; break; }
    }
  }

  // 7) PCComponentes
  if (!img && domain.includes('pccomponentes')) {
    const patterns = [
      /<img[^>]*id="js-product-image"[^>]*src="([^"]+)"/i,
      /"image"\s*:\s*"(https:\/\/thumb\.pccomponentes[^"]+)"/,
      /<img[^>]*class="[^"]*product-image[^"]*"[^>]*src="([^"]+)"/i,
    ];
    for (const p of patterns) {
      const m = html.match(p);
      if (m?.[1]) { img = m[1]; break; }
    }
  }

  // 8) G2A
  if (!img && domain.includes('g2a')) {
    const patterns = [
      /"image"\s*:\s*"(https:\/\/images\.g2a[^"]+)"/,
      /<img[^>]*class="[^"]*product-gallery[^"]*"[^>]*src="([^"]+)"/i,
    ];
    for (const p of patterns) {
      const m = html.match(p);
      if (m?.[1]) { img = m[1]; break; }
    }
  }

  // 9) Agapea
  if (!img && domain.includes('agapea')) {
    const patterns = [
      /<img[^>]*class="[^"]*portada[^"]*"[^>]*src="([^"]+)"/i,
      /<img[^>]*id="imgProducto"[^>]*src="([^"]+)"/i,
      /data-src="(https:\/\/cdn\.agapea[^"]+)"/,
    ];
    for (const p of patterns) {
      const m = html.match(p);
      if (m?.[1]) { img = m[1]; break; }
    }
  }

  // 10) Generic fallback: first large product-ish image
  if (!img) {
    const patterns = [
      /<img[^>]*class="[^"]*product[^"]*"[^>]*src="([^"]+)"/i,
      /<img[^>]*class="[^"]*gallery[^"]*"[^>]*src="([^"]+)"/i,
      /<img[^>]*class="[^"]*main[^"]*image[^"]*"[^>]*src="([^"]+)"/i,
      /<img[^>]*data-large-image="([^"]+)"/i,
      /<img[^>]*data-zoom="([^"]+)"/i,
      /<img[^>]*data-src="([^"]+(?:\.jpg|\.jpeg|\.png|\.webp)[^"]*)"/i,
    ];
    for (const p of patterns) {
      const m = html.match(p);
      if (m?.[1] && !m[1].includes('logo') && !m[1].includes('icon') && !m[1].includes('sprite')) {
        img = m[1]; break;
      }
    }
  }

  // Resolve relative URLs & cleanup
  if (img) {
    img = decode(img);
    img = resolveUrl(img, url);
    // Amazon: get high-res
    if (img.includes('amazon') || img.includes('media-amazon')) {
      img = img.replace(/\._[A-Z]{2}\d+[_,].*?_\./, '.').replace(/\._SS\d+_\./, '.');
    }
    // Shopify: get large
    if (img.includes('shopify') || img.includes('cdn/shop')) {
      img = img.replace(/_\d+x\d+/, '').replace(/&width=\d+/, '').replace(/\?width=\d+/, '');
    }
  }

  return img;
}

// ── NAME extraction ──

function extractName(html: string, domain: string, jsonLd: Record<string, unknown>[]): string | null {
  let name: string | null = null;

  // 1) JSON-LD name
  const ldName = findInJsonLd(jsonLd, 'name');
  if (typeof ldName === 'string' && ldName.length > 2 && ldName.length < 300) {
    name = ldName;
  }

  // 2) OG title
  if (!name) name = getMeta(html, 'og:title');

  // 3) Twitter title
  if (!name) name = getMeta(html, 'twitter:title');

  // 4) <title>
  if (!name) {
    const m = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    if (m) name = m[1];
  }

  // 5) h1 product title
  if (!name) {
    const m = html.match(/<h1[^>]*class="[^"]*(?:product|title)[^"]*"[^>]*>([^<]+)</i);
    if (m) name = m[1];
  }
  if (!name) {
    const m = html.match(/<h1[^>]*>([^<]{3,120})<\/h1>/i);
    if (m) name = m[1];
  }

  if (!name) return null;

  // Clean up store suffixes
  const suffixes = [
    /\s*[-–|:]\s*Amazon\.es.*$/i,
    /\s*[-–|:]\s*Amazon\.com.*$/i,
    /\s*[-–|:]\s*Amazon\.de.*$/i,
    /\s*[-–|:]\s*Idealo.*$/i,
    /\s*[-–|:]\s*Comprar\s*online.*$/i,
    /\s*[-–|:]\s*El\s*Corte\s*Ingl[eé]s.*$/i,
    /\s*[-–|:]\s*PcComponentes.*$/i,
    /\s*[-–|:]\s*PCComponentes.*$/i,
    /\s*[-–|:]\s*Thomann.*$/i,
    /\s*[-–|:]\s*Agapea.*$/i,
    /\s*[-–|:]\s*G2A.*$/i,
    /\s*[-–|:]\s*New\s*Era.*$/i,
    /\s*[-–|:]\s*Mejor\s*precio.*$/i,
    /\s*[-–|:]\s*Tienda\s*online.*$/i,
    /\s*[-–|:]\s*Official\s*Store.*$/i,
    /\s*[-–|:]\s*Offici[ae]l.*$/i,
    /\s*[-–|:]\s*DJI\s*Store.*$/i,
    /\s*[-–|:]\s*tienda\s*DJI.*$/i,
    /\s*[-–|:]\s*Aporro.*$/i,
    /\s*\|\s*[^|]{0,40}$/,
  ];

  for (const s of suffixes) {
    name = name.replace(s, '');
  }

  // Domain-specific cleanup
  if (domain.includes('idealo')) {
    name = name.replace(/\s*desde\s*[\d,.]+\s*€.*$/i, '').replace(/\s*a\s*partir\s*de.*$/i, '');
  }

  return cleanText(name);
}

// ── PRICE extraction ──

function extractPrice(html: string, domain: string, jsonLd: Record<string, unknown>[]): string | null {
  // 1) JSON-LD price (most reliable)
  for (const block of jsonLd) {
    const price = extractPriceFromLd(block);
    if (price) return price;
    const graph = block['@graph'] as Record<string, unknown>[] | undefined;
    if (Array.isArray(graph)) {
      for (const node of graph) {
        const p = extractPriceFromLd(node);
        if (p) return p;
      }
    }
  }

  // 2) Meta tags
  const metaPrice = getMeta(html, 'og:price:amount') || getMeta(html, 'product:price:amount') || getMeta(html, 'price');
  if (metaPrice) {
    const p = toEuro(metaPrice);
    if (p) return p;
  }

  // 3) Amazon specific
  if (domain.includes('amazon')) {
    // Whole + fraction
    const whole = html.match(/class="a-price-whole"[^>]*>(\d+)/);
    const fraction = html.match(/class="a-price-fraction"[^>]*>(\d+)/);
    if (whole?.[1]) {
      const val = `${whole[1]}.${fraction?.[1] || '00'}`;
      return toEuro(val);
    }
    const priceBlock = html.match(/id="priceblock_(?:our|deal|sale)price"[^>]*>([^<]+)/);
    if (priceBlock?.[1]) return toEuro(priceBlock[1]);
    const corePrice = html.match(/class="a-price"[^>]*>[^<]*<span[^>]*>([^<]+)/);
    if (corePrice?.[1]) return toEuro(corePrice[1]);
  }

  // 4) Idealo
  if (domain.includes('idealo')) {
    const m = html.match(/class="[^"]*productOffers-listItemOfferPrice[^"]*"[^>]*>([^<]+)/);
    if (m?.[1]) return toEuro(m[1]);
    const m2 = html.match(/class="[^"]*offerList-item-priceMin[^"]*"[^>]*>([^<]+)/);
    if (m2?.[1]) return toEuro(m2[1]);
  }

  // 5) Thomann
  if (domain.includes('thomann')) {
    const m = html.match(/class="[^"]*product-price[^"]*"[^>]*>\s*([0-9.,]+\s*€?)/i);
    if (m?.[1]) return toEuro(m[1]);
  }

  // 6) PCComponentes
  if (domain.includes('pccomponentes')) {
    const m = html.match(/id="price[^"]*"[^>]*>([^<]+)/);
    if (m?.[1]) return toEuro(m[1]);
    const m2 = html.match(/data-price="([^"]+)"/);
    if (m2?.[1]) return toEuro(m2[1]);
  }

  // 7) Shopify stores
  if (html.includes('Shopify') || domain.includes('coldculture') || domain.includes('gng.la') || domain.includes('neweracap')) {
    const patterns = [
      /"price"\s*:\s*(\d+)/,
      /"price"\s*:\s*"(\d+)"/,
      /class="[^"]*product__price[^"]*"[^>]*>[^0-9]*([0-9.,]+)/i,
      /class="[^"]*price-item--regular[^"]*"[^>]*>[^0-9]*([0-9.,]+)/i,
      /class="[^"]*ProductMeta__Price[^"]*"[^>]*>[^0-9]*([0-9.,]+)/i,
      /class="[^"]*money"[^>]*>[^0-9]*([0-9.,]+)/i,
    ];
    for (const p of patterns) {
      const m = html.match(p);
      if (m?.[1]) {
        let val = m[1];
        // Shopify sometimes stores price in cents
        if (Number(val) > 10000 && !val.includes('.') && !val.includes(',')) {
          val = (Number(val) / 100).toString();
        }
        const price = toEuro(val);
        if (price) return price;
      }
    }
  }

  // 8) Generic patterns (broad)
  const genericPatterns = [
    /class="[^"]*(?:price|Price|precio)[^"]*"[^>]*>[^0-9€$]*([0-9]+[.,]?[0-9]*)\s*€/i,
    /itemprop="price"[^>]*content="([^"]+)"/i,
    /itemprop="price"[^>]*>([^<]+)</i,
    /data-price="([^"]+)"/i,
    /"price"\s*:\s*"([0-9]+[.,]?[0-9]*)"/,
    /"price"\s*:\s*([0-9]+[.,]?[0-9]*)/,
    /([0-9]{1,3}(?:[.,]\d{3})*[.,]\d{2})\s*€/,
  ];

  for (const p of genericPatterns) {
    const m = html.match(p);
    if (m?.[1]) {
      const price = toEuro(m[1]);
      if (price) return price;
    }
  }

  return null;
}

function extractPriceFromLd(block: Record<string, unknown>): string | null {
  const offers = block.offers as Record<string, unknown> | Record<string, unknown>[] | undefined;
  if (!offers) return null;

  const offerList = Array.isArray(offers) ? offers : [offers];
  for (const offer of offerList) {
    const val = offer.price ?? offer.lowPrice ?? offer.highPrice;
    if (val !== undefined && val !== null) {
      return toEuro(String(val));
    }
  }
  return null;
}

// ── FETCH ──

async function fetchPage(url: string): Promise<Response | null> {
  const origin = (() => { try { const u = new URL(url); return `${u.protocol}//${u.hostname}`; } catch { return ''; } })();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'es-ES,es;q=0.9,en-US;q=0.8,en;q=0.7',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'DNT': '1',
        'Sec-Ch-Ua': '"Chromium";v="125", "Not/A)Brand";v="24"',
        'Sec-Ch-Ua-Mobile': '?0',
        'Sec-Ch-Ua-Platform': '"Windows"',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Upgrade-Insecure-Requests': '1',
        'Referer': origin || 'https://www.google.com/',
      },
      signal: controller.signal,
      redirect: 'follow',
    });
    clearTimeout(timeout);
    return res.ok ? res : null;
  } catch {
    clearTimeout(timeout);
    return null;
  }
}

// ── MAIN HANDLER ──

export async function POST(request: Request) {
  try {
    const { url } = await request.json();
    if (!url || typeof url !== 'string' || !url.startsWith('http')) {
      return Response.json({ error: 'URL requerida' }, { status: 400 });
    }

    const domain = getDomain(url);

    const response = await fetchPage(url);

    if (!response) {
      return Response.json({ error: 'No se pudo acceder a la URL. El sitio bloquea peticiones automáticas.' }, { status: 502 });
    }

    const html = await response.text();

    // Detect Cloudflare/bot challenge page (returns HTML but is a block page)
    const isChallenge = html.includes('cf-browser-verification') || html.includes('Checking if the site connection is secure') || html.includes('Enable JavaScript and cookies to continue');
    if (isChallenge) {
      return Response.json({ error: 'El sitio requiere verificación de navegador (Cloudflare). No es posible hacer scraping automático.' }, { status: 403 });
    }

    const jsonLd = parseAllJsonLd(html);

    const image = extractImage(html, url, domain, jsonLd);
    const name = extractName(html, domain, jsonLd);
    const price = extractPrice(html, domain, jsonLd);

    return Response.json({ image, name, price });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Error desconocido';
    return Response.json({ error: msg }, { status: 500 });
  }
}
