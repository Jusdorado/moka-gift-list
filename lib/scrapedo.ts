/* ─────────────────────────────────────────────────
   Fetch de páginas de producto vía Scrape.do.

   Orden de intentos (lo usa lib/extract/fetch.ts):
   1. Scrape.do plano            →  1 crédito
   2. Scrape.do super + render   → 25 créditos (Cloudflare/DataDome)
   3. Fetch directo (en fetch.ts) →  gratis (último recurso, p.ej. sin token)
   ───────────────────────────────────────────────── */

const SCRAPEDO_TIMEOUT_MS = 60000;

/* Nombres aceptados para el token, en orden de preferencia. SCRAPEDO_TOKEN se
   mantiene por compatibilidad con despliegues antiguos. Un único sitio donde
   leerlo: si no, el scraper y el widget de créditos pueden discrepar. */
export const SCRAPEDO_ENV_VARS = ['SCRAPE_DO_API_KEY', 'SCRAPEDO_TOKEN'] as const;

export function getScrapeDoToken(): string | null {
  for (const name of SCRAPEDO_ENV_VARS) {
    const value = process.env[name];
    if (value) return value;
  }
  return null;
}

export function isChallengePage(html: string): boolean {
  return html.includes('cf-browser-verification')
    || html.includes('Checking if the site connection is secure')
    || html.includes('Enable JavaScript and cookies to continue')
    || html.includes('Just a moment')
    || html.includes('Attention Required! | Cloudflare')
    || html.includes('cf_chl_');
}

async function scrapeDoRequest(url: string, extraParams: string, deadline?: number): Promise<string | null> {
  const token = getScrapeDoToken();
  if (!token) return null;

  const budget = deadline !== undefined ? deadline - Date.now() : SCRAPEDO_TIMEOUT_MS;
  if (budget <= 0) return null;

  const apiUrl = `https://api.scrape.do/?token=${encodeURIComponent(token)}&url=${encodeURIComponent(url)}${extraParams}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Math.min(SCRAPEDO_TIMEOUT_MS, budget));

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

// budgetMs: techo opcional (en fetch.ts se acota al presupuesto de trabajo)
export async function fetchViaScrapeDo(url: string, budgetMs?: number): Promise<string | null> {
  const deadline = budgetMs !== undefined ? Date.now() + budgetMs : undefined;

  // Tier 1: request plana (1 crédito)
  const plain = await scrapeDoRequest(url, '', deadline);
  if (plain) {
    console.log(`[SCRAPEDO] Plain request OK (${plain.length} chars) for ${url}`);
    return plain;
  }
  // Tier 2: proxy residencial + renderizado JS (25 créditos)
  const rendered = await scrapeDoRequest(url, '&super=true&render=true', deadline);
  if (rendered) {
    console.log(`[SCRAPEDO] Super+render OK (${rendered.length} chars) for ${url}`);
  }
  return rendered;
}


