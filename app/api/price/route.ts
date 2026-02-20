import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const url = searchParams.get('url');

  if (!url) {
    return NextResponse.json({ error: 'URL is required' }, { status: 400 });
  }

  try {
    // Fetch the product page
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error('Failed to fetch product page');
    }

    const html = await response.text();

    // Extract price using multiple patterns
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
      return NextResponse.json({
        error: 'Google Share links cannot be scraped',
        success: false,
        url
      }, { status: 404 });
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
      // Remove extra spaces and normalize
      price = price.replace(/\s+/g, '');

      // Ensure it has € symbol
      if (!price.includes('€')) {
        price = price + '€';
      }

      return NextResponse.json({
        price,
        success: true,
        url
      });
    }

    return NextResponse.json({
      error: 'Price not found',
      success: false,
      url
    }, { status: 404 });

  } catch (error) {
    console.error('Error fetching price:', error);
    return NextResponse.json({
      error: 'Failed to fetch price',
      success: false,
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
