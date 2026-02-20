import { neon } from '@neondatabase/serverless';
import { Product } from '../types';

type DBProductRow = {
  id: string;
  name: string;
  price: string | null;
  url: string;
  image: string | null;
  size: string | null;
  description: string | null;
  author: string | null;
  color: string | null;
  category: string;
  category_color: string;
  category_emoji: string;
};

type CategoryDefinitionRow = {
  id: string;
  name: string;
  emoji: string;
  color: string;
  fields: unknown[] | null;
};

// Get database connection
function getDb() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.warn('DATABASE_URL not configured, using fallback');
    return null;
  }
  return neon(databaseUrl);
}

export async function getProducts(): Promise<Product[]> {
  try {
    const sql = getDb();
    if (!sql) {
      console.error('DATABASE_URL not configured');
      return [];
    }
    const rows = (await sql`SELECT * FROM products ORDER BY id`) as unknown as DBProductRow[];
    
    // Map database columns (snake_case) to TypeScript interface (camelCase)
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      price: row.price ?? undefined,
      url: row.url,
      image: row.image ?? undefined,
      size: row.size ?? undefined,
      description: row.description ?? undefined,
      author: row.author ?? undefined,
      color: row.color ?? undefined,
      category: row.category,
      categoryColor: row.category_color,
      categoryEmoji: row.category_emoji,
    }));
  } catch (error) {
    console.error('Error fetching products:', error);
    return [];
  }
}

export async function saveProducts(products: Product[]): Promise<void> {
  try {
    const sql = getDb();
    if (!sql) {
      console.warn('Cannot save products: DATABASE_URL not configured');
      return;
    }
    
    // Clear existing products
    await sql`DELETE FROM products`;
    
    // Insert all products
    for (const product of products) {
      await sql`
        INSERT INTO products (
          id, name, price, url, image, size, description, 
          author, color, category, category_color, category_emoji
        ) VALUES (
          ${product.id}, ${product.name}, ${product.price || null}, 
          ${product.url}, ${product.image || null}, ${product.size || null},
          ${product.description || null}, ${product.author || null}, 
          ${product.color || null}, ${product.category}, 
          ${product.categoryColor}, ${product.categoryEmoji}
        )
      `;
    }
  } catch (error) {
    console.error('Error saving products:', error);
    throw error;
  }
}

export async function getProductById(id: string): Promise<Product | null> {
  try {
    const sql = getDb();
    if (!sql) return null;
    const rows = (await sql`SELECT * FROM products WHERE id = ${id} LIMIT 1`) as unknown as DBProductRow[];
    if (!rows || rows.length === 0) return null;
    const row = rows[0];
    return {
      id: row.id,
      name: row.name,
      price: row.price ?? undefined,
      url: row.url,
      image: row.image ?? undefined,
      size: row.size ?? undefined,
      description: row.description ?? undefined,
      author: row.author ?? undefined,
      color: row.color ?? undefined,
      category: row.category,
      categoryColor: row.category_color,
      categoryEmoji: row.category_emoji,
    };
  } catch (error) {
    console.error('Error fetching product by id:', error);
    return null;
  }
}

export async function initializeDatabase(): Promise<void> {
  try {
    const sql = getDb();
    if (!sql) {
      console.warn('Cannot initialize database: DATABASE_URL not configured');
      return;
    }
    
    // Create products table if it doesn't exist
    await sql`
      CREATE TABLE IF NOT EXISTS products (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        price TEXT,
        url TEXT NOT NULL,
        image TEXT,
        size TEXT,
        description TEXT,
        author TEXT,
        color TEXT,
        category TEXT NOT NULL,
        category_color TEXT NOT NULL,
        category_emoji TEXT NOT NULL
      )
    `;
    
    // Create category_definitions table for custom category fields
    await sql`
      CREATE TABLE IF NOT EXISTS category_definitions (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        emoji TEXT NOT NULL,
        color TEXT NOT NULL,
        fields JSONB DEFAULT '[]'
      )
    `;
    
    console.log('✅ Database tables ready');
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
}

export async function getCategoryDefinitions(): Promise<CategoryDefinitionRow[]> {
  try {
    const sql = getDb();
    if (!sql) {
      return [];
    }
    const rows = (await sql`SELECT * FROM category_definitions ORDER BY name`) as unknown as CategoryDefinitionRow[];
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      emoji: row.emoji,
      color: row.color,
      fields: row.fields || [],
    }));
  } catch (error) {
    console.error('Error fetching category definitions:', error);
    return [];
  }
}

export async function saveCategoryDefinition(category: {
  id: string;
  name: string;
  emoji: string;
  color: string;
  fields: unknown[];
}): Promise<void> {
  try {
    const sql = getDb();
    if (!sql) {
      console.warn('Cannot save category: DATABASE_URL not configured');
      return;
    }
    
    // Upsert category definition
    await sql`
      INSERT INTO category_definitions (id, name, emoji, color, fields)
      VALUES (${category.id}, ${category.name}, ${category.emoji}, ${category.color}, ${JSON.stringify(category.fields)})
      ON CONFLICT (name) 
      DO UPDATE SET 
        emoji = EXCLUDED.emoji,
        color = EXCLUDED.color,
        fields = EXCLUDED.fields
    `;
  } catch (error) {
    console.error('Error saving category definition:', error);
    throw error;
  }
}
