import { NextRequest, NextResponse } from 'next/server';
import { getJwtSecret, SESSION_COOKIE_NAME } from '@/lib/auth-config';
import { verifyJWT } from '@/lib/jwt';

const PROTECTED_ROUTES = ['/dashboard', '/generate', '/account', '/history'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isProtected = PROTECTED_ROUTES.some((route) => pathname.startsWith(route));

  if (!isProtected) {
    return NextResponse.next();
  }

  const sessionToken = request.cookies.get(SESSION_COOKIE_NAME);

  if (!sessionToken?.value) {
    const authRoute = pathname.startsWith('/generate') ? '/sign-up' : '/sign-in';
    const redirectUrl = new URL(authRoute, request.url);
    redirectUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(redirectUrl);
  }

  const decoded = await verifyJWT(sessionToken.value, getJwtSecret());

  if (!decoded) {
    const authRoute = pathname.startsWith('/generate') ? '/sign-up' : '/sign-in';
    const redirectUrl = new URL(authRoute, request.url);
    redirectUrl.searchParams.set('callbackUrl', pathname);
    const response = NextResponse.redirect(redirectUrl);
    response.cookies.delete(SESSION_COOKIE_NAME);
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/generate/:path*',
    '/account/:path*',
    '/history/:path*',
  ],
};
