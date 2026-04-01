import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  // 🐛 核心修复：在这里把 params 声明为 Promise
  { params }: { params: Promise<{ filename: string }> } 
) {
  // 🐛 核心修复：在这里加上 await 去解析参数
  const resolvedParams = await params;
  const filename = resolvedParams.filename;
  
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