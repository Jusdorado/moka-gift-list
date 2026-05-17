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

async function restoreProducts() {
  loadEnv();
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL not found');
    process.exit(1);
  }

  const sql = neon(databaseUrl);

  try {
    // Load products from JSON
    const productsJson = readFileSync(join(process.cwd(), 'data', 'products.json'), 'utf-8');
    const products = JSON.parse(productsJson);

    console.log(`📦 Restoring ${products.length} products...`);

    // Clear existing products first
    await sql`DELETE FROM products`;

    // Insert all products
    for (const product of products) {
      await sql`
        INSERT INTO products (
          id, name, price, url, image, size, description, 
          author, color, category, category_color, category_emoji, created_at, purchased
        ) VALUES (
          ${product.id}, ${product.name}, ${product.price || null}, 
          ${product.url}, ${product.image || null}, ${product.size || null},
          ${product.description || null}, ${product.author || null}, 
          ${product.color || null}, ${product.category}, 
          ${product.categoryColor}, ${product.categoryEmoji},
          ${product.createdAt || new Date().toISOString()}, ${product.purchased || false}
        )
      `;
    }

    console.log(`✅ Restored ${products.length} products successfully!`);

    // Verify
    const count = await sql`SELECT COUNT(*) as count FROM products`;
    console.log(`📊 Total products in database: ${count[0].count}`);

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

restoreProducts();
