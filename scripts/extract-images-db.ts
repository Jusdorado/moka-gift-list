import { neon } from '@neondatabase/serverless';
import { readFileSync } from 'fs';
import { join } from 'path';
import { fetchPageHtml } from '../lib/scrapedo';

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

async function extractImage(url: string): Promise<string | null> {
  try {
    const html = await fetchPageHtml(url);
    if (!html) return null;

    let imageUrl = null;

    // Amazon image patterns
    const amazonImagePatterns = [
      /"hiRes":"([^"]+)"/,
      /"large":"([^"]+)"/,
      /id="landingImage"[^>]*src="([^"]+)"/,
    ];

    // Generic image patterns
    const genericImagePatterns = [
      /<meta property="og:image" content="([^"]+)"/,
      /<meta name="twitter:image" content="([^"]+)"/,
      /<meta property="product:image" content="([^"]+)"/,
    ];

    // Try Amazon patterns first
    for (const pattern of amazonImagePatterns) {
      const match = html.match(pattern);
      if (match && match[1]) {
        imageUrl = match[1];
        break;
      }
    }

    // If not found, try generic patterns
    if (!imageUrl) {
      for (const pattern of genericImagePatterns) {
        const match = html.match(pattern);
        if (match && match[1]) {
          imageUrl = match[1];
          break;
        }
      }
    }

    // Clean URL
    if (imageUrl) {
      imageUrl = imageUrl.replace(/&amp;/g, '&');
      if (imageUrl.includes('amazon')) {
        imageUrl = imageUrl.replace(/\._.*?_\./, '.');
      }
    }

    return imageUrl;
  } catch (error) {
    console.error(`Error extracting image:`, error);
    return null;
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

  for (let i = 0; i < products.length; i++) {
    const product = products[i];
    console.log(`[${i + 1}/${products.length}] ${product.name}`);

    if (product.image) {
      console.log(`  ✓ Ya tiene imagen\n`);
      skipped++;
      continue;
    }

    const imageUrl = await extractImage(product.url);
    
    if (imageUrl) {
      await sql`
        UPDATE products 
        SET image = ${imageUrl}
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
  console.log(`❌ Fallidas: ${failed}`);
}

main().catch(console.error);
