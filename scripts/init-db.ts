import { neon } from '@neondatabase/serverless';
import productsData from '../data/products.json';
import { readFileSync } from 'fs';
import { join } from 'path';

const products = productsData as any[];

// Cargar variables de entorno desde .env.local
function loadEnv() {
  try {
    const envPath = join(process.cwd(), '.env.local');
    const envContent = readFileSync(envPath, 'utf-8');
    envContent.split('\n').forEach(line => {
      const [key, ...valueParts] = line.split('=');
      if (key && valueParts.length > 0) {
        const value = valueParts.join('=').trim();
        process.env[key.trim()] = value;
      }
    });
  } catch (error) {
    console.warn('⚠️  Could not load .env.local file');
  }
}

async function initDatabase() {
  loadEnv();
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL not found in environment variables');
    process.exit(1);
  }

  console.log('🔗 Connecting to database...');
  const sql = neon(databaseUrl);

  try {
    // Create products table
    console.log('📋 Creating products table...');
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
    console.log('✅ Products table created');

    // Create category_definitions table
    console.log('📋 Creating category_definitions table...');
    await sql`
      CREATE TABLE IF NOT EXISTS category_definitions (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        emoji TEXT NOT NULL,
        color TEXT NOT NULL,
        fields JSONB DEFAULT '[]'
      )
    `;
    console.log('✅ Category definitions table created');

    // Check if table is empty
    const rows = await sql`SELECT COUNT(*) as count FROM products`;
    const count = parseInt(rows[0].count);
    
    if (count === 0) {
      console.log('📦 Inserting initial products...');
      
      for (const product of products) {
        await sql`
          INSERT INTO products (
            id, name, price, url, image, size, description, 
            author, color, category, category_color, category_emoji
          ) VALUES (
            ${product.id}, 
            ${product.name}, 
            ${product.price || null}, 
            ${product.url}, 
            ${product.image || null}, 
            ${product.size || null},
            ${product.description || null}, 
            ${product.author || null}, 
            ${product.color || null}, 
            ${product.category}, 
            ${product.categoryColor}, 
            ${product.categoryEmoji}
          )
        `;
      }
      
      console.log(`✅ Inserted ${products.length} products`);
    } else {
      console.log(`ℹ️  Database already has ${count} products`);
    }

    console.log('🎉 Database initialization complete!');
  } catch (error) {
    console.error('❌ Error initializing database:', error);
    process.exit(1);
  }
}

initDatabase();
