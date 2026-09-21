import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { extractProduct } from '../lib/extract';

type StoredProduct = {
  id: string;
  name: string;
  price?: string;
  url: string;
  image?: string;
};

const CONCURRENCY = 4;

function domainOf(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return '?'; }
}

function trunc(s: string | null | undefined, n: number): string {
  if (!s) return '-';
  return s.length > n ? s.slice(0, n - 1) + '…' : s;
}

function sameish(a: string | null | undefined, b: string | null | undefined): string {
  if (!a && !b) return '=';
  if (!a || !b) return 'DIFF';
  const na = a.toLowerCase().replace(/\s+/g, ' ');
  const nb = b.toLowerCase().replace(/\s+/g, ' ');
  if (na === nb) return '=';
  if (na.includes(nb) || nb.includes(na)) return '~';
  return 'DIFF';
}

async function main() {
  const products: StoredProduct[] = JSON.parse(
    readFileSync(join(process.cwd(), 'data', 'products.json'), 'utf-8')
  );
  console.log(`Procesando ${products.length} URLs (concurrencia ${CONCURRENCY})...\n`);

  const lines: string[] = [];
  lines.push(`Smoke extract — ${new Date().toISOString()}`);
  lines.push(`URLs: ${products.length}`);
  lines.push('');
  lines.push(
    'STATUS      | DOMINIO                 | NAME (nuevo ↔ guardado)             | PRICE (nuevo ↔ guardado)   | SOURCES (name/price/image)      | WARNINGS'
  );
  lines.push('-'.repeat(160));

  let ok = 0, partial = 0, blocked = 0, notFound = 0, failed = 0;
  let idx = 0;

  async function worker() {
    while (idx < products.length) {
      const i = idx++;
      const p = products[i];
      const dom = domainOf(p.url);
      try {
        const r = await extractProduct(p.url);
        if (r.status === 'ok') ok++;
        else if (r.status === 'partial') partial++;
        else if (r.status === 'blocked') blocked++;
        else if (r.status === 'not_found') notFound++;
        else failed++;

        const src = `${r.fields.name.source || '-'}/${r.fields.name.confidence},` +
          `${r.fields.price.source || '-'}/${r.fields.price.confidence},` +
          `${r.fields.image.source || '-'}/${r.fields.image.confidence}`;
        const nameCmp = `${trunc(r.name, 30)} ${sameish(r.name, p.name)} ${trunc(p.name, 20)}`;
        const priceCmp = `${trunc(r.price, 12)} ${sameish(r.price, p.price)} ${trunc(p.price, 12)}`;
        lines.push(
          `${r.status.padEnd(11)} | ${dom.padEnd(23)} | ${nameCmp.padEnd(36)} | ${priceCmp.padEnd(26)} | ${src.padEnd(31)} | ${r.warnings.join('; ') || '-'}`
        );
        console.log(`[${i + 1}/${products.length}] ${dom} -> ${r.status}`);
      } catch (e) {
        failed++;
        lines.push(`${'error'.padEnd(11)} | ${dom.padEnd(23)} | EXCEPTION: ${e instanceof Error ? e.message : e}`);
        console.log(`[${i + 1}/${products.length}] ${dom} -> EXCEPTION`);
      }
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  lines.push('');
  lines.push(`Resumen: ok=${ok} partial=${partial} blocked=${blocked} not_found=${notFound} fetch_failed/error=${failed}`);

  const outPath = join(process.cwd(), 'smoke-extract-report.txt');
  writeFileSync(outPath, lines.join('\n'), 'utf-8');
  console.log(`\nResumen: ok=${ok} partial=${partial} blocked=${blocked} not_found=${notFound} fetch_failed/error=${failed}`);
  console.log(`Informe guardado en: ${outPath}`);
}

main().catch(e => { console.error(e); process.exit(1); });
