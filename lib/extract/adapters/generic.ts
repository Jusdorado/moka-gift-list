import type { CheerioAPI } from 'cheerio';
import type { Candidate } from '../candidates';
import { priceContextPenalty } from '../candidates';

// Captura el número completo con grupos de miles para no partir "2.999,00"
// en "999,00": parseMoney decide después si el separador es de miles o decimal.
const PRICE_NUMBER = '[0-9]{1,3}(?:[.\\s][0-9]{3})*(?:,[0-9]{1,2})?|[0-9]+(?:[.,][0-9]{1,2})?';
const PRICE_IN_TEXT_RE = new RegExp(`(${PRICE_NUMBER})\\s*(?:€|EUR)`, 'i');
const PRICE_IN_HTML_RE = new RegExp(`(${PRICE_NUMBER})\\s*€`, 'g');

// Recoge candidatos de precio del DOM genérico: elementos con clase/id que
// contenga "price" y matches de "N,NN €" con penalización de contexto.
export function collectGenericPriceCandidates($: CheerioAPI, html: string): Candidate[] {
  const candidates: Candidate[] = [];

  $('[class*="price" i], [id*="price" i], [data-price]').each((_, el) => {
    const text = $(el).text().trim();
    const m = text.match(PRICE_IN_TEXT_RE);
    if (m) {
      candidates.push({ value: m[1], source: 'dom:generic', confidence: 'low', penalty: 0 });
    }
  });

  let m;
  while ((m = PRICE_IN_HTML_RE.exec(html)) !== null) {
    candidates.push({
      value: m[1],
      source: 'dom:generic',
      confidence: 'low',
      penalty: priceContextPenalty(html, m.index, m[0].length),
    });
  }

  return candidates;
}
