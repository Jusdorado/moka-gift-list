import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const imageUrl = searchParams.get('url');

  if (!imageUrl) {
    return new NextResponse('Missing image URL', { status: 400 });
  }

  try {
    // Decode URL if needed
    let decodedUrl = imageUrl;
    try {
      decodedUrl = decodeURIComponent(imageUrl);
    } catch {
      // URL might already be decoded
    }
    
    // Fix common URL issues
    if (decodedUrl.startsWith('http://')) {
      decodedUrl = decodedUrl.replace('http://', 'https://');
    }
    
    const response = await fetch(decodedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9,es;q=0.8',
        'Sec-Fetch-Dest': 'image',
        'Sec-Fetch-Mode': 'no-cors',
      },
      signal: AbortSignal.timeout(15000), // 15 second timeout
    });

    if (!response.ok) {
      // Return 404 to trigger fallback in frontend
      return new NextResponse(null, { status: 404 });
    }

    const imageBuffer = await response.arrayBuffer();
    
    // Check if we actually got image data
    if (imageBuffer.byteLength < 100) {
      return new NextResponse(null, { status: 404 });
    }
    
    const contentType = response.headers.get('content-type') || 'image/jpeg';

    return new NextResponse(imageBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('Error proxying image:', error);
    return new NextResponse(null, { status: 404 });
  }
}
