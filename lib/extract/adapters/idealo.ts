import type { CheerioAPI } from 'cheerio';
import type { AdapterResult } from './amazon';

export function extractIdealo($: CheerioAPI, html: string): AdapterResult {
  const result: AdapterResult = {};
  const m =
    html.match(/class="[^"]*productOffers-listItemOfferPrice[^"]*"[^>]*>[\s\S]*?([0-9]+[.,][0-9]{2})/i) ||
    html.match(/data-testid="price"[^>]*>([0-9]+[.,][0-9]{2})/i) ||
    html.match(/([0-9]+,[0-9]{2})\s*€/);
  if (m) result.price = m[1].trim();
  const ogTitle = $('meta[property="og:title"]').attr('content');
  if (ogTitle) result.name = ogTitle.trim();
  return result;
}
