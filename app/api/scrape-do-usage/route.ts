import { getScrapeDoUsage } from '../../../lib/scrape-do-usage';

export const maxDuration = 60;

export async function GET() {
  const apiKey = process.env.SCRAPE_DO_API_KEY;

  if (!apiKey) {
    return Response.json({ error: 'API key not configured' }, { status: 400 });
  }

  const usage = await getScrapeDoUsage(apiKey);

  if (!usage) {
    return Response.json({ error: 'Failed to fetch usage' }, { status: 500 });
  }

  return Response.json(usage);
}
