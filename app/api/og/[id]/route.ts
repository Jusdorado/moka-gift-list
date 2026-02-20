import React from 'react';
import { ImageResponse } from 'next/og';
import { getProductById } from '../../../../lib/db';

export const runtime = 'edge';
export const revalidate = 0;
export const dynamic = 'force-dynamic';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://gifts.justogarcia.es';
const OG_WIDTH = 1200;
const OG_HEIGHT = 630;

async function fetchProductFallback(id: string) {
  try {
    const res = await fetch(`${SITE_URL}/api/products?id=${id}`, { cache: 'no-store' });
    if (!res.ok) return null;
    const data = await res.json();
    if (Array.isArray(data.products) && data.products.length > 0) {
      return data.products[0];
    }
    return null;
  } catch (e) {
    console.error('OG fallback fetch error', e);
    return null;
  }
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = (await getProductById(id)) || (await fetchProductFallback(id));

  if (!product) {
    return new Response('Product not found', { status: 404 });
  }

  const imageUrl = product?.image
    ? product.image.startsWith('http')
      ? product.image
      : `${SITE_URL}${product.image}`
    : `${SITE_URL}/og-default.svg`;

  const detailLines = [
    product?.size ? `Talla: ${product.size}` : null,
    product?.color ? `Color: ${product.color}` : null,
    product?.category ? `Categoría: ${product.category}` : null,
  ].filter(Boolean) as string[];

  const rawName = product?.name || 'Moka Gift List';
  const name = rawName.length > 70 ? `${rawName.slice(0, 67)}…` : rawName;
  const fullDescription = product?.description || 'Descubre este regalo destacado en nuestra lista curada.';
  const description = fullDescription.length > 210 ? `${fullDescription.slice(0, 207)}…` : fullDescription;

  const badgeBorder = product?.categoryColor || '#c9a66b';
  const detailBadges = detailLines.map((line, idx) =>
    React.createElement(
      'div',
      {
        key: idx,
        style: {
          padding: '10px 14px',
          borderRadius: 12,
          background: '#f8f5f0',
          border: `1px solid ${badgeBorder}`,
          fontSize: 21,
          color: '#3c2a21',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 12px 30px rgba(0,0,0,0.18)',
        },
      },
      line
    )
  );

  const categoryBadge = React.createElement(
    'div',
    {
      style: {
        width: 48,
        height: 48,
        borderRadius: 12,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: product?.categoryColor || '#fbbf24',
        color: '#0f172a',
        fontSize: 28,
      },
    },
    product?.categoryEmoji || '🎁'
  );

  const tree = React.createElement(
    'div',
    {
      style: {
        display: 'flex',
        width: '100%',
        height: '100%',
        background: 'linear-gradient(135deg, #3c2a21 0%, #4f3424 35%, #2b1b12 100%)',
        color: '#f8f5f0',
        fontFamily: '"DM Sans", "Segoe UI", sans-serif',
        position: 'relative',
        overflow: 'hidden',
      },
    },
    React.createElement(
      'div',
      {
        style: {
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 6,
        },
      },
      React.createElement(
        'div',
        {
          style: {
            width: OG_WIDTH - 12,
            height: OG_HEIGHT - 12,
            display: 'flex',
            gap: 16,
            alignItems: 'stretch',
            justifyContent: 'space-between',
            border: '1px solid rgba(248,245,240,0.14)',
            borderRadius: 22,
            padding: 10,
            background: 'rgba(20,14,10,0.35)',
            boxShadow: '0 32px 120px rgba(0,0,0,0.38)',
          },
        },
        React.createElement(
          'div',
          {
            style: {
              flex: '0 0 auto',
              width: 580,
              height: '100%',
              borderRadius: 18,
              overflow: 'hidden',
              display: 'flex',
            },
          },
          React.createElement('img', {
            src: imageUrl,
            alt: name,
            style: {
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: 'block',
              borderRadius: 18,
            },
          })
        ),
        React.createElement(
          'div',
          {
            style: { display: 'flex', flexDirection: 'column', gap: 18, minWidth: 0, justifyContent: 'space-between', flex: 1, alignSelf: 'stretch', padding: 10 },
          },
          React.createElement(
            'div',
            { style: { display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' } },
            categoryBadge,
            React.createElement(
              'div',
              { style: { display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 } },
              React.createElement(
                'div',
                { style: { fontSize: 24, color: '#d5c7bd', fontWeight: 600, display: 'flex', letterSpacing: 0.3 } },
                'Moka Gift List'
              ),
              React.createElement(
                'div',
                { style: { fontSize: 36, fontWeight: 800, color: '#f8f5f0', display: 'flex', letterSpacing: 0.1, lineHeight: 1.1 } },
                name
              )
            )
          ),
          React.createElement(
            'div',
            { style: { fontSize: 22, lineHeight: 1.4, color: '#eaddd1', maxWidth: 720, display: 'flex' } },
            description
          ),
          React.createElement(
            'div',
            { style: { display: 'flex', gap: 10, flexWrap: 'wrap', width: '100%', marginTop: 8 } },
            ...detailBadges
          ),
          React.createElement(
            'div',
            { style: { fontSize: 20, color: '#d5c7bd', display: 'flex', marginTop: 8 } },
            SITE_URL.replace('https://', '')
          )
        )
      )
    )
  );

  return new ImageResponse(tree, { width: OG_WIDTH, height: OG_HEIGHT });
}
