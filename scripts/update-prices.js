const fs = require('fs');
const path = require('path');

const productsPath = path.join(__dirname, '..', 'data', 'products.json');

async function extractPrice(url) {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
      },
    });

    if (!response.ok) return null;

    const html = await response.text();
    let price = null;
    const domain = new URL(url).hostname;

    // Thomann.de/es patterns
    if (domain.includes('thomann')) {
      const thomannPatterns = [
        /"price":"([0-9]+[.,][0-9]+)"/,
        /"price":\s*"([0-9]+[.,][0-9]+)"/,
        /data-current-price="([0-9]+[.,][0-9]+)"/,
        /data-price="([0-9]+[.,][0-9]+)"/,
        /<span[^>]*data-price[^>]*>[\s]*([0-9]+[.,][0-9]+)/i,
        /<div[^>]*class="[^"]*price[^"]*"[^>]*>[\s]*([0-9]+[.,][0-9]+)/i,
        /currentPrice[^}]*value[^:]*:\s*([0-9]+[.,][0-9]+)/i,
      ];
      for (const pattern of thomannPatterns) {
        const match = html.match(pattern);
        if (match) {
          price = match[1].trim();
          break;
        }
      }
    }

    // Casa del Libro patterns
    if (!price && domain.includes('casadellibro')) {
      const casaDelLibroPatterns = [
        /<span[^>]*class="[^"]*price[^"]*"[^>]*>[\s]*([0-9]+[.,][0-9]+)\s*€/i,
        /<div[^>]*class="[^"]*precio[^"]*"[^>]*>[\s]*([0-9]+[.,][0-9]+)\s*€/i,
        /"price":\s*"?([0-9]+[.,][0-9]+)"?/,
        /data-price="([0-9]+[.,][0-9]+)"/,
      ];
      for (const pattern of casaDelLibroPatterns) {
        const match = html.match(pattern);
        if (match) {
          price = match[1].trim();
          break;
        }
      }
    }

    // Agapea patterns
    if (!price && domain.includes('agapea')) {
      const agapeaPatterns = [
        /<span[^>]*id="[^"]*precio[^"]*"[^>]*>[\s]*([0-9]+[.,][0-9]+)\s*€/i,
        /<div[^>]*class="[^"]*precio[^"]*"[^>]*>[\s]*([0-9]+[.,][0-9]+)\s*€/i,
        /"price":\s*"?([0-9]+[.,][0-9]+)"?/,
      ];
      for (const pattern of agapeaPatterns) {
        const match = html.match(pattern);
        if (match) {
          price = match[1].trim();
          break;
        }
      }
    }

    // GNG.la patterns
    if (!price && domain.includes('gng.la')) {
      const gngPatterns = [
        /"price":\s*"([0-9]+[.,][0-9]+)"/,
        /<span[^>]*class="[^"]*price[^"]*"[^>]*>[\s]*([0-9]+[.,][0-9]+)\s*€/i,
        /data-product-price="([0-9]+[.,][0-9]+)"/,
      ];
      for (const pattern of gngPatterns) {
        const match = html.match(pattern);
        if (match) {
          price = match[1].trim();
          break;
        }
      }
    }

    // Zara patterns
    if (!price && domain.includes('zara.com')) {
      const zaraPatterns = [
        /"price":\s*([0-9]+)/,
        /data-price="([0-9]+[.,][0-9]+)"/,
        /<span[^>]*class="[^"]*price[^"]*"[^>]*>[\s]*([0-9]+[.,][0-9]+)\s*€/i,
      ];
      for (const pattern of zaraPatterns) {
        const match = html.match(pattern);
        if (match) {
          price = match[1].trim();
          break;
        }
      }
    }

    // Cold Culture patterns
    if (!price && domain.includes('coldculture')) {
      const coldCulturePatterns = [
        /"price":\s*"([0-9]+[.,][0-9]+)"/,
        /<span[^>]*class="[^"]*price[^"]*"[^>]*>[\s]*([0-9]+[.,][0-9]+)/i,
        /data-product-price="([0-9]+[.,][0-9]+)"/,
      ];
      for (const pattern of coldCulturePatterns) {
        const match = html.match(pattern);
        if (match) {
          price = match[1].trim();
          break;
        }
      }
    }

    // Game.es patterns
    if (!price && domain.includes('game.es')) {
      const gamePatterns = [
        /<span[^>]*class="[^"]*price[^"]*"[^>]*>[\s]*([0-9]+[.,][0-9]+)\s*€/i,
        /"price":\s*"?([0-9]+[.,][0-9]+)"?/,
        /data-price="([0-9]+[.,][0-9]+)"/,
      ];
      for (const pattern of gamePatterns) {
        const match = html.match(pattern);
        if (match) {
          price = match[1].trim();
          break;
        }
      }
    }

    // PCComponentes patterns
    if (!price && domain.includes('pccomponentes')) {
      const pcComponentesPatterns = [
        /"price":"([0-9]+[.,][0-9]+)"/,
        /data-price="([0-9]+[.,][0-9]+)"/,
        /<span[^>]*id="[^"]*precio[^"]*"[^>]*>[\s]*([0-9]+[.,][0-9]+)/i,
        /<div[^>]*class="[^"]*precio[^"]*"[^>]*>[\s]*([0-9]+[.,][0-9]+)/i,
        /precio-actual[^>]*>[\s]*([0-9]+[.,][0-9]+)/i,
      ];
      for (const pattern of pcComponentesPatterns) {
        const match = html.match(pattern);
        if (match) {
          price = match[1].trim();
          break;
        }
      }
    }

    // Idealo patterns
    if (!price && domain.includes('idealo')) {
      const idealoPatterns = [
        /"price":"([0-9]+[.,][0-9]+)"/,
        /data-price="([0-9]+[.,][0-9]+)"/,
        /<span[^>]*class="[^"]*price[^"]*"[^>]*>[\s]*([0-9]+[.,][0-9]+)/i,
        /bestPrice[^}]*amount[^:]*:\s*([0-9]+[.,][0-9]+)/i,
      ];
      for (const pattern of idealoPatterns) {
        const match = html.match(pattern);
        if (match) {
          price = match[1].trim();
          break;
        }
      }
    }

    // Amazon patterns
    if (!price && domain.includes('amazon')) {
      const amazonPatterns = [
        /<span class="a-price-whole">([^<]+)<\/span>/,
        /<span class="a-offscreen">([^<]+)<\/span>/,
        /"priceAmount":([0-9.,]+)/,
        /data-a-color="price">([^<]+)</,
      ];
      for (const pattern of amazonPatterns) {
        const match = html.match(pattern);
        if (match) {
          price = match[1].trim();
          break;
        }
      }
    }

    // Google Share / Redirect links - skip scraping
    if (!price && domain.includes('share.google')) {
      return null;
    }

    // Generic fallback patterns (more comprehensive)
    if (!price) {
      const genericPatterns = [
        /"price":"([0-9]+[.,][0-9]+)"/,
        /"price":\s*"?([0-9]+[.,][0-9]+)"?/,
        /data-price="([0-9]+[.,][0-9]+)"/,
        /<span[^>]*class="[^"]*price[^"]*"[^>]*>[\s]*([0-9]+[.,][0-9]+)/i,
        /<div[^>]*class="[^"]*price[^"]*"[^>]*>[\s]*([0-9]+[.,][0-9]+)/i,
        /<span[^>]*id="[^"]*price[^"]*"[^>]*>[\s]*([0-9]+[.,][0-9]+)/i,
        /precio[^>]*>[\s]*([0-9]+[.,][0-9]+)/i,
        /price[^>]*>[\s]*([0-9]+[.,][0-9]+)/i,
      ];
      for (const pattern of genericPatterns) {
        const match = html.match(pattern);
        if (match) {
          price = match[1].trim();
          break;
        }
      }
    }

    // Clean and format price
    if (price) {
      price = price.replace(/\s+/g, '');
      if (!price.includes('€')) {
        price = price + '€';
      }
      // Normalize decimal separator to comma
      price = price.replace('.', ',');
    }

    return price;
  } catch (error) {
    console.error(`Error extracting price from ${url}:`, error.message);
    return null;
  }
}

async function main() {
  console.log('💰 Actualizando precios de productos...\n');

  // Read current products
  let products = [];
  if (fs.existsSync(productsPath)) {
    const data = fs.readFileSync(productsPath, 'utf-8');
    products = JSON.parse(data);
  } else {
    console.error('❌ No se encontró products.json');
    return;
  }

  console.log(`📦 Procesando ${products.length} productos...\n`);

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
      products[i].price = newPrice;
      
      if (oldPrice !== newPrice) {
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

    // Wait 2 seconds between requests to avoid rate limiting
    if (i < products.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  // Save updated products
  fs.writeFileSync(productsPath, JSON.stringify(products, null, 2), 'utf-8');

  console.log('\n✨ Proceso completado!');
  console.log(`✅ Precios actualizados: ${updated}`);
  console.log(`ℹ️  Sin cambios: ${skipped}`);
  console.log(`❌ Fallidos: ${failed}`);
  console.log(`📁 Guardado en: ${productsPath}`);
}

main().catch(console.error);
