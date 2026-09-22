import { NextRequest, NextResponse } from 'next/server';
import { addProducts } from '../../../../lib/db';
import { MAX_BULK_ADD } from '../../../../lib/constants';
import { Product } from '../../../../types';

type Incoming = Record<string, unknown>;

function asText(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

/* Valida un producto entrante. Devuelve el motivo del rechazo en vez de
   lanzar, para poder decirle al usuario cuál de los N de la tanda falla. */
function validate(raw: Incoming, index: number): { product: Product } | { error: string } {
  const label = `Producto ${index + 1}`;

  const name = asText(raw.name);
  if (!name) return { error: `${label}: falta el nombre` };

  const url = asText(raw.url);
  if (!url) return { error: `${label}: falta la URL` };
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return { error: `${label}: la URL debe ser http o https` };
    }
  } catch {
    return { error: `${label}: la URL no es válida` };
  }

  const category = asText(raw.category);
  if (!category) return { error: `${label}: falta la categoría` };

  return {
    product: {
      id: '', // lo genera addProducts, para que no colisionen dentro de la tanda
      name,
      url,
      category,
      categoryColor: asText(raw.categoryColor) || '#d946ef',
      categoryEmoji: asText(raw.categoryEmoji) || '📦',
      price: asText(raw.price),
      image: asText(raw.image),
      size: asText(raw.size),
      description: asText(raw.description),
      author: asText(raw.author),
      color: asText(raw.color),
      purchased: false,
    },
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const incoming = body?.products;

    if (!Array.isArray(incoming)) {
      return NextResponse.json({ error: 'Se esperaba una lista de productos' }, { status: 400 });
    }
    if (incoming.length === 0) {
      return NextResponse.json({ error: 'No hay productos que añadir' }, { status: 400 });
    }
    if (incoming.length > MAX_BULK_ADD) {
      return NextResponse.json(
        { error: `Máximo ${MAX_BULK_ADD} productos por tanda` },
        { status: 400 }
      );
    }

    const validated: Product[] = [];
    for (let i = 0; i < incoming.length; i++) {
      const result = validate(incoming[i] as Incoming, i);
      if ('error' in result) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
      validated.push(result.product);
    }

    const created = await addProducts(validated);
    return NextResponse.json({ products: created, added: created.length });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Error desconocido';
    console.error('POST /api/products/add:', msg);
    return NextResponse.json({ error: 'No se pudieron guardar los productos' }, { status: 500 });
  }
}
