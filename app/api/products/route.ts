import { NextRequest, NextResponse } from 'next/server';
import { getProducts, saveProducts } from '../../../lib/db';
import { writeFile } from 'fs/promises';
import { join } from 'path';


export const dynamic = 'force-dynamic';
export const revalidate = 0;

// GET - Read products
export async function GET(req: NextRequest) {
  try {

    const products = await getProducts();

    const id = req.nextUrl.searchParams.get('id');
    const payload = id ? products.filter((p) => p.id === id) : products;

    return NextResponse.json(
      { products: payload, success: true },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      }
    );
  } catch (error) {
    console.error('Error reading products:', error);
    return NextResponse.json({
      error: 'Failed to read products',
      details: error instanceof Error ? error.message : 'Unknown error',
      success: false
    }, { status: 500 });
  }
}

// POST - Save products
export async function POST(request: NextRequest) {
  try {

    const { products } = await request.json();

    if (!products || !Array.isArray(products)) {
      return NextResponse.json({
        error: 'Invalid products data',
        success: false
      }, { status: 400 });
    }



    // Determinar si estamos en producción
    const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL || process.env.NETLIFY;

    // Save to database (siempre intentar)
    let dbSaved = false;
    try {
      await saveProducts(products);

      dbSaved = true;
    } catch (dbError) {
      console.warn('POST /api/products - Database save failed:', dbError);
      // Si estamos en producción y falla la DB, es un error crítico
      if (isProduction) {
        throw new Error('Database save failed in production: ' + (dbError instanceof Error ? dbError.message : 'Unknown error'));
      }
    }

    // Save to JSON file (solo en desarrollo/local)
    if (!isProduction) {
      try {
        const jsonPath = join(process.cwd(), 'data', 'products.json');
        await writeFile(jsonPath, JSON.stringify(products, null, 2), 'utf-8');

      } catch (jsonError) {
        console.error('POST /api/products - JSON file save failed:', jsonError);
        // En local, si falla el JSON pero la DB funcionó, está OK
        if (!dbSaved) {
          throw jsonError;
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Products saved successfully',
      savedTo: isProduction ? 'database' : 'database and local file'
    });
  } catch (error) {
    console.error('Error saving products:', error);
    return NextResponse.json({
      error: 'Failed to save products',
      details: error instanceof Error ? error.message : 'Unknown error',
      success: false
    }, { status: 500 });
  }
}
