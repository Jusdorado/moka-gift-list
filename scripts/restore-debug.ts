import { neon } from '@neondatabase/serverless';
import { readFileSync } from 'fs';
import { join } from 'path';

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

async function restoreDebug() {
  loadEnv();
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL not found');
    process.exit(1);
  }

  console.log('🔗 Connecting to:', databaseUrl.substring(0, 50) + '...');
  const sql = neon(databaseUrl);

  try {
    // Check before
    const before = await sql`SELECT COUNT(*) as count FROM products`;
    console.log('Before:', before[0].count);

    // Load products from JSON
    const productsJson = readFileSync(join(process.cwd(), 'data', 'products.json'), 'utf-8');
    const products = JSON.parse(productsJson);
    console.log(`📦 Loaded ${products.length} products from JSON`);

    // Show first product
    console.log('First product:', products[0].id, products[0].name);

    // Try inserting one product manually
    const testProduct = products[0];
    console.log('Inserting first product...');
    
    const result = await sql`
      INSERT INTO products (
        id, name, price, url, image, size, description, 
        author, color, category, category_color, category_emoji, created_at, purchased
      ) VALUES (
        ${testProduct.id}, ${testProduct.name}, ${testProduct.price || null}, 
        ${testProduct.url}, ${testProduct.image || null}, ${testProduct.size || null},
        ${testProduct.description || null}, ${testProduct.author || null}, 
        ${testProduct.color || null}, ${testProduct.category}, 
        ${testProduct.categoryColor}, ${testProduct.categoryEmoji},
        ${testProduct.createdAt || new Date().toISOString()}, ${testProduct.purchased || false}
      )
      RETURNING id
    `;
    console.log('Insert result:', result);

    // Check after
    const after = await sql`SELECT COUNT(*) as count FROM products`;
    console.log('After:', after[0].count);

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

restoreDebug();
