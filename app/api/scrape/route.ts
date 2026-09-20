import { extractProduct } from '../../../lib/extract';

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const { url } = await request.json();
    if (!url || typeof url !== 'string' || !url.startsWith('http')) {
      return Response.json({ error: 'URL requerida' }, { status: 400 });
    }

    const extraction = await extractProduct(url);
    console.log(`[SCRAPE] ${url} -> status=${extraction.status} name=${extraction.name ? 'yes' : 'no'} price=${extraction.price ? 'yes' : 'no'} image=${extraction.image ? 'yes' : 'no'}`);

    return Response.json({
      image: extraction.image,
      name: extraction.name,
      price: extraction.price,
      currency: extraction.currency,
      priceAmount: extraction.priceAmount,
      fields: extraction.fields,
      status: extraction.status,
      warnings: extraction.warnings,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Error desconocido';
    console.error(`[SCRAPE] Error: ${msg}`);
    return Response.json({ error: msg }, { status: 500 });
  }
}
