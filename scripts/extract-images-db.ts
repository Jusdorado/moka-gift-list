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

  console.log('🖼️  Extrayendo imágenes de productos...\n');
  const products = await sql`SELECT * FROM products ORDER BY id`;
  console.log(`📦 Procesando ${products.length} productos...\n`);

  let updated = 0;
  let failed = 0;
  let skipped = 0;
  let blocked = 0;
  let notFound = 0;

  for (let i = 0; i < products.length; i++) {
    const product = products[i];
    console.log(`[${i + 1}/${products.length}] ${product.name}`);

    if (product.image) {
      console.log(`  ✓ Ya tiene imagen\n`);
      skipped++;
      continue;
    }

    const extraction = await extractProduct(product.url);

    if (extraction.status === 'blocked') {
      console.log(`  ⛔ Tienda bloqueada (Cloudflare/challenge)\n`);
      blocked++;
    } else if (extraction.status === 'not_found') {
      console.log(`  ⚠️  Enlace caído (404/410)\n`);
      notFound++;
    } else if (extraction.image) {
      await sql`
        UPDATE products 
        SET image = ${extraction.image}
        WHERE id = ${product.id}
      `;
      console.log(`  ✅ Imagen encontrada y guardada\n`);
      updated++;
    } else {
      console.log(`  ❌ No se pudo encontrar imagen\n`);
      failed++;
    }

    // Wait 1 second between requests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log('\n✨ Proceso completado!');
  console.log(`✅ Imágenes añadidas: ${updated}`);
  console.log(`ℹ️  Ya tenían imagen: ${skipped}`);
  console.log(`⛔ Bloqueados: ${blocked}`);
  console.log(`⚠️  Enlaces caídos: ${notFound}`);
  console.log(`❌ Fallidas: ${failed}`);
}

main().catch(console.error);
