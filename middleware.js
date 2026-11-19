import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

export async function middleware(req) {
  let user = null;
  const token = req.cookies.get('token')?.value;
  if (token) {
    try {
      user = (await jwtVerify(token, new TextEncoder().encode(process.env.JWT_SECRET))).payload;
    } catch {}
  }
  if (!user) return NextResponse.redirect(new URL('/login', req.url));
  if (req.nextUrl.pathname.startsWith('/admin') && user.role !== 'admin') {
    return NextResponse.redirect(new URL('/', req.url));
  }
  return NextResponse.next();
}

export const config = { matcher: ['/admin/:path*', '/dashboard/:path*', '/rooms/:path*'] };