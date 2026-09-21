import { getScrapeDoUsage } from '../../../lib/scrape-do-usage';
import { getScrapeDoToken, SCRAPEDO_ENV_VARS } from '../../../lib/scrapedo';

export const maxDuration = 60;

export async function GET() {
  // Mismo token que usa el scraper, para que widget y extracción no discrepen
  const apiKey = getScrapeDoToken();

  if (!apiKey) {
    return Response.json(
      { error: `Falta la variable de entorno (${SCRAPEDO_ENV_VARS.join(' o ')})` },
      { status: 400 }
    );
  }

  const usage = await getScrapeDoUsage(apiKey);

  if (!usage) {
    return Response.json({ error: 'Scrape.do no devolvió el uso' }, { status: 502 });
  }

  return Response.json(usage);
}
