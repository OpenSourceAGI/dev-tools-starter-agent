import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith('/docs/') && pathname.endsWith('.mdx')) {
    const slug = pathname.slice('/docs/'.length, -'.mdx'.length);
    const url = request.nextUrl.clone();
    url.pathname = `/llms.mdx/docs/${slug}`;
    return NextResponse.rewrite(url);
  }
}

export const config = {
  matcher: '/docs/:path+',
};
