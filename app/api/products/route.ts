import { NextRequest, NextResponse } from 'next/server';
import { getProducts, saveProducts, deleteProductsByCategory, updateProductsCategory } from '../../../lib/db';
import { neon } from '@neondatabase/serverless';
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

// PATCH - Bulk operations by category (delete or relocate)
export async function PATCH(request: NextRequest) {
  try {
    const { action, category, newCategory, productIds } = await request.json();

    if (!action) {
      return NextResponse.json({
        error: 'Action is required',
        success: false
      }, { status: 400 });
    }

    if (action === 'delete') {
      if (!category) {
        return NextResponse.json({
          error: 'Category is required for delete',
          success: false
        }, { status: 400 });
      }
      const count = await deleteProductsByCategory(category);
      return NextResponse.json({
        success: true,
        message: `${count} productos eliminados`,
        count
      });
    }

    if (action === 'deleteMultiple') {
      if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
        return NextResponse.json({
          error: 'productIds array is required',
          success: false
        }, { status: 400 });
      }
      const databaseUrl = process.env.DATABASE_URL;
      if (!databaseUrl) {
        return NextResponse.json({
          error: 'Database not configured',
          success: false
        }, { status: 500 });
      }
      const sql = neon(databaseUrl);
      await sql`DELETE FROM products WHERE id IN (${productIds})`;
      return NextResponse.json({
        success: true,
        message: `${productIds.length} productos eliminados`,
        count: productIds.length
      });
    }

    if (action === 'relocate') {
      if (!category || !newCategory) {
        return NextResponse.json({
          error: 'Category and newCategory are required for relocate',
          success: false
        }, { status: 400 });
      }
      const count = await updateProductsCategory(category, newCategory);
      return NextResponse.json({
        success: true,
        message: `${count} productos reubicados a ${newCategory}`,
        count
      });
    }

    if (action === 'relocateMultiple') {
      if (!productIds || !Array.isArray(productIds) || productIds.length === 0 || !newCategory) {
        return NextResponse.json({
          error: 'productIds array and newCategory are required',
          success: false
        }, { status: 400 });
      }
      const databaseUrl = process.env.DATABASE_URL;
      if (!databaseUrl) {
        return NextResponse.json({
          error: 'Database not configured',
          success: false
        }, { status: 500 });
      }
      const sql = neon(databaseUrl);
      await sql`UPDATE products SET category = ${newCategory} WHERE id IN (${productIds})`;
      return NextResponse.json({
        success: true,
        message: `${productIds.length} productos reubicados a ${newCategory}`,
        count: productIds.length
      });
    }

    return NextResponse.json({
      error: 'Invalid action',
      success: false
    }, { status: 400 });
  } catch (error) {
    console.error('Error in PATCH /api/products:', error);
    return NextResponse.json({
      error: 'Failed to process bulk operation',
      details: error instanceof Error ? error.message : 'Unknown error',
      success: false
    }, { status: 500 });
  }
}
