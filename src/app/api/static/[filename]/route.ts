import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { filename: string } }
) {
  const filename = params.filename;
  // 指向你的阿里云后端
  const backendUrl = `http://47.93.151.189:8000/static/${filename}`;

  try {
    const response = await fetch(backendUrl, { cache: 'no-store' });
    
    if (!response.ok) {
      return new NextResponse('Image not found on backend', { status: 404 });
    }

    const blob = await response.blob();
    return new NextResponse(blob, {
      headers: {
        'Content-Type': response.headers.get('Content-Type') || 'image/png',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error) {
    return new NextResponse('Failed to fetch image', { status: 500 });
  }
}