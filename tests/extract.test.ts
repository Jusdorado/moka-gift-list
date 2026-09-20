import assert from 'node:assert/strict';
import { parseMoney, formatPrice, parseDisplayPrice } from '../lib/extract/price';
import { parseJsonLdBlocks, selectProductNode } from '../lib/extract/jsonld';
import { extractProduct } from '../lib/extract';

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void | Promise<void>) {
  return Promise.resolve()
    .then(fn)
    .then(() => { passed++; console.log(`  ✓ ${name}`); })
    .catch(err => { failed++; console.error(`  ✗ ${name}\n    ${err.message}`); });
}

const realFetch = globalThis.fetch;

function mockFetch(res: { status: number; body: string; headers?: Record<string, string> }) {
  globalThis.fetch = (() =>
    Promise.resolve(
      new Response(res.body, { status: res.status, headers: res.headers })
    )) as typeof fetch;
}

function mockFetchFn(fn: (url: string) => { status: number; body: string }) {
  globalThis.fetch = ((input: unknown) => {
    const url = typeof input === 'string' ? input : (input as Request).url;
    const res = fn(url);
    return Promise.resolve(new Response(res.body, { status: res.status }));
  }) as typeof fetch;
}

async function main() {
  console.log('\nparseMoney');
  await test('"2.999" -> 2999', () => {
    assert.equal(parseMoney('2.999')!.amount, 2999);
  });
  await test('"1.299" -> 1299', () => {
    assert.equal(parseMoney('1.299')!.amount, 1299);
  });
  await test('"5.999" -> 5999', () => {
    assert.equal(parseMoney('5.999')!.amount, 5999);
  });
  await test('"2.999,00" -> 2999', () => {
    assert.equal(parseMoney('2.999,00')!.amount, 2999);
  });
  await test('"1,299.00" -> 1299', () => {
    assert.equal(parseMoney('1,299.00')!.amount, 1299);
  });
  await test('"159" -> 159', () => {
    assert.equal(parseMoney('159')!.amount, 159);
  });
  await test('"29,99 €" -> 29.99 EUR', () => {
    const r = parseMoney('29,99 €')!;
    assert.equal(r.amount, 29.99);
    assert.equal(r.currency, 'EUR');
  });
  await test('"$85.00" -> 85 USD', () => {
    const r = parseMoney('$85.00')!;
    assert.equal(r.amount, 85);
    assert.equal(r.currency, 'USD');
  });
  await test('"£45.50" -> 45.5 GBP', () => {
    const r = parseMoney('£45.50')!;
    assert.equal(r.amount, 45.5);
    assert.equal(r.currency, 'GBP');
  });
  await test('8500 con source shopify-js -> 85', () => {
    assert.equal(parseMoney(8500, { source: 'shopify-js' })!.amount, 85);
  });
  await test('8500 sin source -> 8500', () => {
    assert.equal(parseMoney(8500)!.amount, 8500);
  });
  await test('"0" -> null', () => {
    assert.equal(parseMoney('0'), null);
  });
  await test('"999999" -> null', () => {
    assert.equal(parseMoney('999999'), null);
  });

  console.log('\nformatPrice / parseDisplayPrice');
  await test('2999 EUR -> "2.999,00€"', () => {
    assert.equal(formatPrice(2999, 'EUR'), '2.999,00€');
  });
  await test('85 USD -> "$85.00"', () => {
    assert.equal(formatPrice(85, 'USD'), '$85.00');
  });
  await test('parseDisplayPrice("$85.00") -> 85', () => {
    assert.equal(parseDisplayPrice('$85.00'), 85);
  });
  await test('parseDisplayPrice("2.999,00€") -> 2999', () => {
    assert.equal(parseDisplayPrice('2.999,00€'), 2999);
  });

  console.log('\nJSON-LD selection');
  await test('New Era (Organization+WebSite+WebPage) no devuelve Organization.name', () => {
    const html = `
      <script type="application/ld+json">{"@type":"Organization","name":"New Era Cap"}</script>
      <script type="application/ld+json">{"@type":"WebSite","name":"New Era"}</script>
      <script type="application/ld+json">{"@type":"WebPage","name":"404 No encontrado"}</script>`;
    const blocks = parseJsonLdBlocks(html);
    const sel = selectProductNode(blocks);
    assert.equal(sel.product, null);
    assert.notEqual(sel.webPage?.name, 'New Era Cap');
  });
  await test('@graph con Product -> lo encuentra', () => {
    const html = `<script type="application/ld+json">{
      "@context":"https://schema.org",
      "@graph":[
        {"@type":"Organization","name":"Shop"},
        {"@type":"Product","name":"Gorra X","offers":{"price":"29.99","priceCurrency":"EUR"}}
      ]}</script>`;
    const sel = selectProductNode(parseJsonLdBlocks(html));
    assert.equal(sel.product?.name, 'Gorra X');
  });
  await test('@type array ["Product","Offer"] -> reconocido', () => {
    const html = `<script type="application/ld+json">{
      "@type":["Product","Offer"],"name":"Item Y","price":10}</script>`;
    const sel = selectProductNode(parseJsonLdBlocks(html));
    assert.equal(sel.product?.name, 'Item Y');
  });

  console.log('\nClasificación de fetch (extractProduct con fetch mockeado)');
  await test('HTML "Just a moment..." -> blocked y campos null', async () => {
    mockFetch({
      status: 200,
      body: '<html><head><title>Just a moment...</title></head><body>cf</body></html>'.padEnd(4000, ' '),
    });
    const r = await extractProduct('https://example.es/producto/x');
    assert.equal(r.status, 'blocked');
    assert.equal(r.name, null);
    assert.equal(r.price, null);
    assert.equal(r.image, null);
  });
  await test('404 -> not_found y campos null', async () => {
    mockFetch({ status: 404, body: '<html>404</html>' });
    const r = await extractProduct('https://example.es/producto/x');
    assert.equal(r.status, 'not_found');
    assert.equal(r.name, null);
    assert.equal(r.price, null);
    assert.equal(r.image, null);
  });

  console.log('\nDOM genérico: miles sin partir');
  await test('"2.999,00 €" en DOM -> 2.999,00€ (2999)', async () => {
    mockFetch({
      status: 200,
      body: '<html><head><meta property="og:title" content="Producto X"></head><body><div class="product">2.999,00 €</div></body></html>',
    });
    const r = await extractProduct('https://example.es/producto/x');
    assert.equal(r.price, '2.999,00€');
    assert.equal(r.priceAmount, 2999);
  });
  await test('"1.299 €" en DOM -> 1.299,00€ (1299)', async () => {
    mockFetch({
      status: 200,
      body: '<html><head><meta property="og:title" content="Producto Y"></head><body><div class="product">1.299 €</div></body></html>',
    });
    const r = await extractProduct('https://example.es/producto/x');
    assert.equal(r.price, '1.299,00€');
    assert.equal(r.priceAmount, 1299);
  });

  await test('fetch siempre 403 con retardo -> resuelve blocked dentro del presupuesto', async () => {
    const started = Date.now();
    globalThis.fetch = (() =>
      new Promise<Response>(resolve =>
        setTimeout(() => resolve(new Response('<html>Forbidden</html>', { status: 403 })), 3000)
      )) as typeof fetch;
    const r = await extractProduct('https://siempre-403.example/producto/x');
    const elapsed = Date.now() - started;
    assert.equal(r.status, 'blocked');
    assert.equal(r.name, null);
    assert.equal(r.price, null);
    assert.equal(r.image, null);
    assert.ok(elapsed < 25000, `tardo ${elapsed}ms, esperado < 25000`);
  });

  await test('cola por host no degrada: 3 extracciones concurrentes al mismo host -> ok', async () => {
    const html = '<html><head><meta property="og:title" content="Prod"><meta property="og:image" content="https://x.es/i.jpg"><meta property="og:price:amount" content="10,00"></head><body>ok</body></html>';
    mockFetch({ status: 200, body: html });
    const rs = await Promise.all([1, 2, 3].map(i =>
      extractProduct(`https://cola.example/producto/${i}`)
    ));
    for (const r of rs) {
      assert.equal(r.status, 'ok');
      assert.equal(r.name, 'Prod');
    }
  });

  console.log('\nShopify .js muerto');
  await test('.js 404 en host Shopify -> not_found y campos null (no raspa la home)', async () => {
    mockFetchFn(url => {
      if (url.endsWith('.js')) return { status: 404, body: '{}' };
      return { status: 200, body: '<html><head><meta property="og:title" content="COLD CULTURE | STREETWEAR"></head><body>cdn/shop files</body></html>' };
    });
    const r = await extractProduct('https://coldcultureworldwide.com/products/handle-muerto');
    assert.equal(r.status, 'not_found');
    assert.equal(r.name, null);
    assert.equal(r.price, null);
    assert.equal(r.image, null);
  });

  globalThis.fetch = realFetch;

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

main();
