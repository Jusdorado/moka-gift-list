/* ─────────────────────────────────────────────────
   Fetch de páginas de producto.

   Orden de intentos:
   1. Scrape.do plano            →  1 crédito
   2. Scrape.do super + render   → 25 créditos (Cloudflare/DataDome)
   3. Fetch directo              →  gratis (último recurso, p.ej. sin token)
   ───────────────────────────────────────────────── */

const SCRAPEDO_TIMEOUT_MS = 60000;
const DIRECT_TIMEOUT_MS = 12000;

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
];

export function isChallengePage(html: string): boolean {
  return html.includes('cf-browser-verification')
    || html.includes('Checking if the site connection is secure')
    || html.includes('Enable JavaScript and cookies to continue')
    || html.includes('Just a moment')
    || html.includes('Attention Required! | Cloudflare')
    || html.includes('cf_chl_');
}

async function scrapeDoRequest(url: string, extraParams: string): Promise<string | null> {
  const token = process.env.SCRAPEDO_TOKEN;
  if (!token) return null;

  const apiUrl = `https://api.scrape.do/?token=${encodeURIComponent(token)}&url=${encodeURIComponent(url)}${extraParams}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), SCRAPEDO_TIMEOUT_MS);

  try {
    const res = await fetch(apiUrl, { signal: controller.signal });
    if (!res.ok) {
      console.log(`[SCRAPEDO] Non-OK status ${res.status} for ${url}`);
      return null;
    }
    const html = await res.text();
    if (!html || isChallengePage(html)) {
      console.log(`[SCRAPEDO] Empty or challenge page for ${url}`);
      return null;
    }
    return html;
  } catch (error) {
    console.log(`[SCRAPEDO] Failed for ${url}: ${error instanceof Error ? error.message : 'unknown'}`);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchViaScrapeDo(url: string): Promise<string | null> {
  // Tier 1: request plana (1 crédito)
  const plain = await scrapeDoRequest(url, '');
  if (plain) {
    console.log(`[SCRAPEDO] Plain request OK (${plain.length} chars) for ${url}`);
    return plain;
  }
  // Tier 2: proxy residencial + renderizado JS (25 créditos)
  const rendered = await scrapeDoRequest(url, '&super=true&render=true');
  if (rendered) {
    console.log(`[SCRAPEDO] Super+render OK (${rendered.length} chars) for ${url}`);
  }
  return rendered;
}

async function fetchDirect(url: string): Promise<string | null> {
  for (const ua of USER_AGENTS) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), DIRECT_TIMEOUT_MS);
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': ua,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
          'Accept-Language': 'es-ES,es;q=0.9,en-US;q=0.8,en;q=0.7',
          'Cache-Control': 'no-cache',
          'DNT': '1',
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'cross-site',
          'Sec-Fetch-User': '?1',
          'Upgrade-Insecure-Requests': '1',
          'Referer': 'https://www.google.com/',
        },
        signal: controller.signal,
        redirect: 'follow',
      });
      clearTimeout(timeout);
      if (res.ok) {
        const html = await res.text();
        if (html && !isChallengePage(html)) return html;
      }
    } catch {
      clearTimeout(timeout);
    }
  }
  return null;
}

// Scrape.do primero (plano → super+render); fetch directo como último recurso
export async function fetchPageHtml(url: string): Promise<string | null> {
  const viaScrapeDo = await fetchViaScrapeDo(url);
  if (viaScrapeDo) return viaScrapeDo;

  console.log(`[FETCH] Scrape.do unavailable for ${url}, trying direct fetch`);
  const direct = await fetchDirect(url);
  if (direct) {
    console.log(`[FETCH] Direct fetch OK (${direct.length} chars) for ${url}`);
  } else {
    console.log(`[FETCH] All methods failed for ${url}`);
  }
  return direct;
}
