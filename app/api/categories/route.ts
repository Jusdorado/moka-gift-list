import { NextRequest, NextResponse } from 'next/server';
import { getCategoryDefinitions, saveCategoryDefinition } from '../../../lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// GET - Read category definitions
export async function GET() {
  try {
    const categories = await getCategoryDefinitions();
    
    return NextResponse.json(
      { categories, success: true },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      }
    );
  } catch (error) {
    console.error('Error reading categories:', error);
    return NextResponse.json({ 
      error: 'Failed to read categories',
      details: error instanceof Error ? error.message : 'Unknown error',
      success: false 
    }, { status: 500 });
  }
}

// POST - Save category definition
export async function POST(request: NextRequest) {
  try {
    const { category } = await request.json();
    
    if (!category || !category.name) {
      return NextResponse.json({ 
        error: 'Invalid category data',
        success: false 
      }, { status: 400 });
    }
    
    await saveCategoryDefinition(category);
    
    return NextResponse.json({ 
      success: true,
      message: 'Category saved successfully'
    });
  } catch (error) {
    console.error('Error saving category:', error);
    return NextResponse.json({ 
      error: 'Failed to save category',
      details: error instanceof Error ? error.message : 'Unknown error',
      success: false 
    }, { status: 500 });
  }
}
