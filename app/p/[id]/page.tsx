import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getProductById } from '../../../lib/db';
import { Product } from '../../../types';
import ClientRedirect from '../../../components/ClientRedirect';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://gifts.justogarcia.es';
export const dynamic = 'force-dynamic';
const DEFAULT_OG_IMAGE = `${SITE_URL}/og-default.svg`;

async function fetchProductFallback(id: string) {
  try {
    const res = await fetch(`${SITE_URL}/api/products?id=${id}`, { cache: 'no-store' });
    if (!res.ok) return null;
    const data = await res.json();
    if (Array.isArray(data.products)) {
      return data.products.find((p: Product) => p.id === id) || null;
    }
    return null;
  } catch {
    return null;
  }
}

function buildDescription(product: Product) {
  const parts = [] as string[];
  if (product.price) parts.push(`Precio: ${product.price}`);
  if (product.size) parts.push(`Talla: ${product.size}`);
  if (product.color) parts.push(`Color: ${product.color}`);
  if (product.category) parts.push(`Categoría: ${product.category}`);
  if (product.description) parts.push(product.description);
  return parts.join(' · ').slice(0, 200) || product.name;
}

export async function generateMetadata({ params, searchParams }: { params: Promise<{ id?: string }>; searchParams?: { product?: string } }): Promise<Metadata> {
  const resolvedParams = await params;
  const productId = resolvedParams?.id || searchParams?.product;
  if (!productId) {
    return {
      title: 'Moka Gift List',
      description: 'Lista de regalos',
      metadataBase: new URL(SITE_URL),
    };
  }

  const product = (await getProductById(productId)) || (await fetchProductFallback(productId));
  const base = new URL(SITE_URL);

  if (!product) {
    return {
      title: 'Moka Gift List',
      description: 'Lista de regalos',
      metadataBase: base,
      openGraph: {
        title: 'Moka Gift List',
        description: 'Lista de regalos',
        url: `${SITE_URL}/p/${productId}`,
        type: 'website',
        images: [
          {
            url: DEFAULT_OG_IMAGE,
            width: 1200,
            height: 630,
            alt: 'Moka Gift List',
          },
        ],
      },
      twitter: {
        card: 'summary_large_image',
        title: 'Moka Gift List',
        description: 'Lista de regalos',
        images: [DEFAULT_OG_IMAGE],
      },
    };
  }

  const ogImage = product.image ? `${SITE_URL}/api/og/${product.id}` : DEFAULT_OG_IMAGE;

  const description = buildDescription(product);

  return {
    title: `${product.name} | Moka Gift List`,
    description,
    metadataBase: base,
    openGraph: {
      title: product.name,
      description,
      url: `${SITE_URL}/p/${product.id}`,
      type: 'website',
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: product.name,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: product.name,
      description,
      images: [ogImage],
    },
  };
}

export default async function ProductSharePage({ params, searchParams }: { params: Promise<{ id?: string }>; searchParams?: { product?: string } }) {
  const resolvedParams = await params;
  const productId = resolvedParams?.id || searchParams?.product;
  if (!productId) {
    notFound();
  }

  // Página para metadata OG; en cliente abrimos directamente el modal del producto en la home.
  return <ClientRedirect href={`/?product=${productId}`} />;
}
