import { NextRequest, NextResponse } from 'next/server';
import { extractProduct } from '../../../lib/extract';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url');

  if (!url) {
    return NextResponse.json({ error: 'URL is required' }, { status: 400 });
  }

  try {
    const extraction = await extractProduct(url);

    if (extraction.price) {
      return NextResponse.json({
        price: extraction.price,
        success: true,
        url,
      });
    }

    return NextResponse.json({
      error: 'Price not found',
      success: false,
      url,
    }, { status: 404 });
  } catch (error) {
    console.error('Error fetching price:', error);
    return NextResponse.json({
      error: 'Failed to fetch price',
      success: false,
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
