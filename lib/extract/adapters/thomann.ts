import type { CheerioAPI } from 'cheerio';
import type { AdapterResult } from './amazon';

export function extractThomann($: CheerioAPI, html: string): AdapterResult {
  const result: AdapterResult = {};
  const m =
    html.match(/"price"\s*:\s*"?([0-9]+[.,][0-9]+)"?/) ||
    html.match(/data-current-price="([0-9]+[.,][0-9]+)"/) ||
    html.match(/<meta[^>]+itemprop="price"[^>]+content="([0-9]+[.,][0-9]+)"/i);
  if (m) result.price = m[1].trim();
  const ogTitle = $('meta[property="og:title"]').attr('content');
  if (ogTitle) result.name = ogTitle.trim();
  return result;
}
