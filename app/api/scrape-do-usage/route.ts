import { getScrapeDoUsage } from '../../../lib/scrape-do-usage';

export const maxDuration = 60;

export async function GET() {
  const apiKey = process.env.SCRAPE_DO_API_KEY;

  console.log('[API] scrape-do-usage called, API key present:', !!apiKey);

  if (!apiKey) {
    console.error('[API] SCRAPE_DO_API_KEY not configured');
    return Response.json({ error: 'API key not configured' }, { status: 400 });
  }

  const usage = await getScrapeDoUsage(apiKey);

  if (!usage) {
    console.error('[API] Failed to fetch usage from Scrape.do');
    return Response.json({ error: 'Failed to fetch usage' }, { status: 500 });
  }

  console.log('[API] Usage fetched successfully:', usage);
  return Response.json(usage);
}
