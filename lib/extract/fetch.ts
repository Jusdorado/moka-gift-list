import { fetchViaScrapeDo } from '../scrapedo';

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
];

const TIMEOUT_MS = 8000;
const RETRY_BACKOFF_MS = 1500;
const HOST_MIN_INTERVAL_MS = 2500;
const WORK_BUDGET_MS = 20000;
const HARD_LIMIT_MS = 45000;

export type FetchStatus = 'ok' | 'blocked' | 'not_found' | 'fetch_failed';

export type FetchResult = {
  status: FetchStatus;
  html: string | null;
  httpStatus: number | null;
};

const CHALLENGE_MARKERS = [
  'Just a moment...',
  'cf-browser-verification',
  'Checking if the site connection is secure',
  'Enable JavaScript and cookies to continue',
  'Access Denied',
];

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Throttle por host: mínimo HOST_MIN_INTERVAL_MS entre peticiones al mismo
// hostname, serializado con una cadena de promesas por host. Es cortesía entre
// productos distintos: se aplica una vez por extracción (fetchPage /
// fetchShopifyJs), no por cada intento de UA.
const hostChains = new Map<string, Promise<void>>();
const hostLastFetch = new Map<string, number>();

export function throttleFor(url: string): Promise<void> {
  let host: string;
  try {
    host = new URL(url).hostname;
  } catch {
    return Promise.resolve();
  }
  const prev = hostChains.get(host) ?? Promise.resolve();
  const next = prev.then(async () => {
    const elapsed = Date.now() - (hostLastFetch.get(host) ?? 0);
    const wait = HOST_MIN_INTERVAL_MS - elapsed;
    if (wait > 0) await sleep(wait);
    hostLastFetch.set(host, Date.now());
  });
  hostChains.set(host, next);
  return next;
}

function isBlockedHtml(html: string, headers: Headers): boolean {
  if (headers.get('cf-mitigated')) return true;
  for (const marker of CHALLENGE_MARKERS) {
    if (html.includes(marker)) return true;
  }
  if (html.length < 3072 && !html.includes('og:') && !html.includes('ld+json')) {
    return true;
  }
  return false;
}

async function fetchOnce(url: string, ua: string, timeoutMs: number): Promise<Response | null> {
  try {
    return await fetch(url, {
      headers: {
        'User-Agent': ua,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
      },
      signal: AbortSignal.timeout(timeoutMs),
      redirect: 'follow',
    });
  } catch {
    return null;
  }
}

// deadline: techo duro absoluto para TODA la extracción (cola incluida). El
// presupuesto de trabajo (WORK_BUDGET_MS) arranca después de la espera en la
// cola de cortesía: tiempo en cola != tiempo de presupuesto.
export async function fetchPage(url: string, deadline?: number): Promise<FetchResult> {
  const hardLimit = deadline ?? Date.now() + HARD_LIMIT_MS;
  const queued = await Promise.race([
    throttleFor(url).then(() => true),
    sleep(Math.max(0, hardLimit - Date.now())).then(() => false),
  ]);
  if (!queued || Date.now() >= hardLimit) {
    return { status: 'fetch_failed', html: null, httpStatus: null };
  }
  const limit = Math.min(Date.now() + WORK_BUDGET_MS, hardLimit);

  // Scrape.do primero (1 cr plano → 25 cr super+render); el fetch directo con
  // rotación de UAs queda como último recurso (p.ej. sin SCRAPE_DO_API_KEY)
  const scraped = await fetchViaScrapeDo(url, limit - Date.now());
  if (scraped) {
    return { status: 'ok', html: scraped, httpStatus: 200 };
  }

  let sawBlocked: number | null = null;
  let sawServerError: number | null = null;

  let firstAttempt = true;
  for (const ua of USER_AGENTS) {
    const remaining = limit - Date.now();
    if (remaining <= 0) break;
    // Espacio corto entre intentos de UA del mismo fetch (cortesía; la cola por
    // host solo aplica una vez por extracción)
    if (!firstAttempt) {
      const pause = Math.min(RETRY_BACKOFF_MS, limit - Date.now());
      if (pause > 0) await sleep(pause);
    }
    firstAttempt = false;
    let res = await fetchOnce(url, ua, Math.min(TIMEOUT_MS, limit - Date.now()));
    if (!res) continue;
    if (res.status === 429 || res.status >= 500) {
      const retryRemaining = limit - Date.now();
      if (retryRemaining > RETRY_BACKOFF_MS) {
        await sleep(RETRY_BACKOFF_MS);
        res = (await fetchOnce(url, ua, Math.min(TIMEOUT_MS, limit - Date.now()))) ?? res;
      }
    }
    if (res.ok) {
      const html = await res.text();
      if (isBlockedHtml(html, res.headers)) {
        // 200 con página de challenge/stub: anota y prueba el siguiente UA
        sawBlocked = sawBlocked ?? res.status;
        continue;
      }
      return { status: 'ok', html, httpStatus: res.status };
    }
    // 404/410 no cambia con el UA: corta enseguida
    if (res.status === 404 || res.status === 410) {
      return { status: 'not_found', html: null, httpStatus: res.status };
    }
    // 403/429: anota y prueba el siguiente UA
    if (res.status === 403 || res.status === 429) {
      sawBlocked = sawBlocked ?? res.status;
      continue;
    }
    if (res.status >= 500) {
      sawServerError = sawServerError ?? res.status;
      continue;
    }
  }

  if (sawBlocked !== null) return { status: 'blocked', html: null, httpStatus: sawBlocked };
  return { status: 'fetch_failed', html: null, httpStatus: sawServerError };
}
