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
        process.env[key.trim()] = valueParts.join('=').trim();
      }
    });
  } catch (error) {
    console.warn('⚠️  Could not load .env.local file');
  }
}

async function checkDatabase() {
  loadEnv();
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL not found');
    process.exit(1);
  }

  const sql = neon(databaseUrl);

  try {
    const products = await sql`SELECT id, name, category, purchased FROM products ORDER BY name`;
    console.log(`📦 Total products in database: ${products.length}`);
    
    if (products.length > 0) {
      console.log('\n📝 Products:');
      products.forEach((p: any) => {
        console.log(`  - ${p.name} (${p.category})${p.purchased ? ' [COMPRADO]' : ''}`);
      });
    } else {
      console.log('\n⚠️  DATABASE IS EMPTY!');
    }

    const categories = await sql`SELECT COUNT(*) as count FROM category_definitions`;
    console.log(`\n📂 Categories: ${categories[0].count}`);

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkDatabase();
