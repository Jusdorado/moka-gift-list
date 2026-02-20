const fs = require('fs');
const path = require('path');

// Load products
const dataPath = path.join(__dirname, '..', 'data.ts');
const productsPath = path.join(__dirname, '..', 'data', 'products.json');

async function extractImage(url) {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      },
    });

    if (!response.ok) return null;

    const html = await response.text();
    let imageUrl = null;

    // Amazon image patterns
    const amazonImagePatterns = [
      /"hiRes":"([^"]+)"/,
      /"large":"([^"]+)"/,
      /id="landingImage"[^>]*src="([^"]+)"/,
      /<img[^>]*id="imgBlkFront"[^>]*src="([^"]+)"/,
    ];

    // Generic image patterns (Open Graph, meta tags)
    const genericImagePatterns = [
      /<meta property="og:image" content="([^"]+)"/,
      /<meta name="twitter:image" content="([^"]+)"/,
      /<meta property="product:image" content="([^"]+)"/,
      /<img[^>]*class="[^"]*product[^"]*"[^>]*src="([^"]+)"/i,
      /<img[^>]*src="([^"]*product[^"]*\.(jpg|jpeg|png|webp))"/i,
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
      // Remove size parameters for Amazon
      if (imageUrl.includes('amazon')) {
        imageUrl = imageUrl.replace(/\._.*?_\./, '.');
      }
    }

    return imageUrl;
  } catch (error) {
    console.error(`Error extracting image from ${url}:`, error.message);
    return null;
  }
}

async function main() {
  console.log('🖼️  Extrayendo imágenes de productos...\n');

  // Read current products
  let products = [];
  if (fs.existsSync(productsPath)) {
    const data = fs.readFileSync(productsPath, 'utf-8');
    products = JSON.parse(data);
  } else {
    // Read from data.ts
    const dataContent = fs.readFileSync(dataPath, 'utf-8');
    const productsMatch = dataContent.match(/export const products: Product\[\] = (\[[\s\S]*?\]);/);
    if (productsMatch) {
      // This is a simplified extraction, might need adjustment
      console.log('⚠️  Usando productos de data.ts');
      console.log('⚠️  Por favor, ejecuta este script después de tener products.json');
      return;
    }
  }

  console.log(`📦 Procesando ${products.length} productos...\n`);

  let updated = 0;
  let failed = 0;

  for (let i = 0; i < products.length; i++) {
    const product = products[i];
    console.log(`[${i + 1}/${products.length}] ${product.name}`);

    if (product.image) {
      console.log(`  ✓ Ya tiene imagen\n`);
      continue;
    }

    const imageUrl = await extractImage(product.url);
    
    if (imageUrl) {
      products[i].image = imageUrl;
      console.log(`  ✅ Imagen encontrada: ${imageUrl.substring(0, 60)}...\n`);
      updated++;
    } else {
      console.log(`  ❌ No se pudo encontrar imagen\n`);
      failed++;
    }

    // Wait 1 second between requests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Save updated products
  fs.writeFileSync(productsPath, JSON.stringify(products, null, 2), 'utf-8');

  console.log('\n✨ Proceso completado!');
  console.log(`✅ Imágenes añadidas: ${updated}`);
  console.log(`❌ Fallidas: ${failed}`);
  console.log(`📁 Guardado en: ${productsPath}`);
}

main().catch(console.error);
