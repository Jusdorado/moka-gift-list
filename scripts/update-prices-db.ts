import { neon } from '@neondatabase/serverless';
import { readFileSync } from 'fs';
import { join } from 'path';
import { extractProduct } from '../lib/extract';

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

async function main() {
  loadEnv();
  
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL not found');
    process.exit(1);
  }

  console.log('🔗 Connecting to database...');
  const sql = neon(databaseUrl);

  // Get all products
  console.log('📦 Loading products from database...');
  const products = await sql`SELECT * FROM products ORDER BY id`;
  console.log(`Found ${products.length} products\n`);

  let updated = 0;
  let failed = 0;
  let skipped = 0;
  let blocked = 0;
  let notFound = 0;

  for (let i = 0; i < products.length; i++) {
    const product = products[i];
    console.log(`[${i + 1}/${products.length}] ${product.name}`);
    console.log(`  URL: ${product.url}`);
    console.log(`  Precio actual: ${product.price || 'Sin precio'}`);

    const extraction = await extractProduct(product.url);

    if (extraction.status === 'blocked') {
      console.log(`  ⛔ Tienda bloqueada (Cloudflare/challenge) — sin cambios\n`);
      blocked++;
    } else if (extraction.status === 'not_found') {
      console.log(`  ⚠️  Enlace caído (404/410) — sin cambios\n`);
      notFound++;
    } else if (extraction.price) {
      const newPrice = extraction.price;
      const oldPrice = product.price;
      
      if (oldPrice !== newPrice) {
        // Update price in database
        await sql`
          UPDATE products 
          SET price = ${newPrice}
          WHERE id = ${product.id}
        `;
        console.log(`  ✅ Precio actualizado: ${oldPrice} → ${newPrice}\n`);
        updated++;
      } else {
        console.log(`  ℹ️  Precio sin cambios: ${newPrice}\n`);
        skipped++;
      }
    } else {
      console.log(`  ❌ No se pudo extraer el precio\n`);
      failed++;
    }

    // Wait 2 seconds between requests
    if (i < products.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  console.log('\n✨ Proceso completado!');
  console.log(`✅ Precios actualizados: ${updated}`);
  console.log(`ℹ️  Sin cambios: ${skipped}`);
  console.log(`⛔ Bloqueados: ${blocked}`);
  console.log(`⚠️  Enlaces caídos: ${notFound}`);
  console.log(`❌ Fallidos: ${failed}`);
}

main().catch(console.error);
