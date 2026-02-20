import { neon } from '@neondatabase/serverless';
import { readFileSync } from 'fs';
import { join } from 'path';

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

async function extractPrice(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9',
        'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
      },
    });

    if (!response.ok) return null;

    const html = await response.text();
    let price = null;
    const domain = new URL(url).hostname;

    // Thomann patterns
    if (domain.includes('thomann')) {
      const patterns = [
        /"price":"([0-9]+[.,][0-9]+)"/,
        /data-current-price="([0-9]+[.,][0-9]+)"/,
        /<span[^>]*data-price[^>]*>[\s]*([0-9]+[.,][0-9]+)/i,
      ];
      for (const pattern of patterns) {
        const match = html.match(pattern);
        if (match) {
          price = match[1].trim();
          break;
        }
      }
    }

    // Casa del Libro patterns
    if (!price && domain.includes('casadellibro')) {
      const patterns = [
        /<span[^>]*class="[^"]*price[^"]*"[^>]*>[\s]*([0-9]+[.,][0-9]+)\s*€/i,
        /"price":\s*"?([0-9]+[.,][0-9]+)"?/,
      ];
      for (const pattern of patterns) {
        const match = html.match(pattern);
        if (match) {
          price = match[1].trim();
          break;
        }
      }
    }

    // Amazon patterns
    if (!price && domain.includes('amazon')) {
      const patterns = [
        /<span[^>]*class="[^"]*a-price-whole[^"]*"[^>]*>([0-9]+[.,][0-9]*)/i,
        /"price":\s*"?([0-9]+[.,][0-9]+)"?/,
      ];
      for (const pattern of patterns) {
        const match = html.match(pattern);
        if (match) {
          price = match[1].trim();
          break;
        }
      }
    }

    if (price) {
      return price.replace(',', '.') + '€';
    }
    return null;
  } catch (error) {
    console.error('Error extracting price:', error);
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

  // Get all products
  console.log('📦 Loading products from database...');
  const products = await sql`SELECT * FROM products ORDER BY id`;
  console.log(`Found ${products.length} products\n`);

  let updated = 0;
  let failed = 0;
  let skipped = 0;

  for (let i = 0; i < products.length; i++) {
    const product = products[i];
    console.log(`[${i + 1}/${products.length}] ${product.name}`);
    console.log(`  URL: ${product.url}`);
    console.log(`  Precio actual: ${product.price || 'Sin precio'}`);

    const newPrice = await extractPrice(product.url);
    
    if (newPrice) {
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
  console.log(`❌ Fallidos: ${failed}`);
}

main().catch(console.error);
