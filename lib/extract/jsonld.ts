export type JsonLdNode = Record<string, unknown>;

const PRODUCT_TYPES = new Set(['Product', 'Book', 'IndividualProduct', 'Vehicle']);
const CONTAINER_KEYS = ['@graph', 'mainEntity', 'itemListElement', 'hasPart'];

function sanitizeJson(text: string): string {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:"'])\/\/[^\n]*/g, '$1')
    .replace(/,(\s*[}\]])/g, '$1')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&');
}

// Extrae y parsea todos los bloques <script type="application/ld+json"> del HTML.
export function parseJsonLdBlocks(html: string): JsonLdNode[] {
  const nodes: JsonLdNode[] = [];
  const re = /<script[^>]*type=["']?application\/ld\+json["']?[^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    try {
      const parsed = JSON.parse(sanitizeJson(m[1].trim()));
      if (Array.isArray(parsed)) nodes.push(...parsed.filter(n => n && typeof n === 'object'));
      else if (parsed && typeof parsed === 'object') nodes.push(parsed as JsonLdNode);
    } catch {}
  }
  return nodes;
}

function nodeTypes(node: JsonLdNode): string[] {
  const t = node['@type'];
  if (typeof t === 'string') return [t];
  if (Array.isArray(t)) return t.filter((x): x is string => typeof x === 'string');
  return [];
}

function* walk(node: unknown): Generator<JsonLdNode> {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) {
    for (const item of node) yield* walk(item);
    return;
  }
  const n = node as JsonLdNode;
  yield n;
  for (const key of CONTAINER_KEYS) {
    if (key in n) yield* walk(n[key]);
  }
  if ('offers' in n) yield* walk(n.offers);
}

export type JsonLdSelection = {
  product: JsonLdNode | null;
  webPage: JsonLdNode | null;
};

// Recorre bloques + @graph + mainEntity + itemListElement y selecciona
// el primer nodo cuyo @type incluya Product (o Book/IndividualProduct/Vehicle).
// Si no hay ninguno, devuelve el primer WebPage para degradado.
export function selectProductNode(blocks: JsonLdNode[]): JsonLdSelection {
  let webPage: JsonLdNode | null = null;
  for (const block of blocks) {
    for (const node of walk(block)) {
      const types = nodeTypes(node);
      if (types.some(t => PRODUCT_TYPES.has(t))) {
        return { product: node, webPage };
      }
      if (!webPage && types.includes('WebPage')) webPage = node;
    }
  }
  return { product: null, webPage };
}
