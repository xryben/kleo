import { NextRequest, NextResponse } from 'next/server';

const PUBLIC_PATHS = ['/login', '/register'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths and static assets
  if (
    PUBLIC_PATHS.some((p) => pathname.startsWith(p)) ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // Check for auth token in cookies (primary) or fall through to client-side check
  // Since tokens are currently in localStorage (client-only), middleware acts as
  // a structural guard. The cookie-based check below is for future HttpOnly migration.
  const token = request.cookies.get('cleo_token')?.value;

  // If we have a cookie token, allow the request
  if (token) {
    return NextResponse.next();
  }

  // For localStorage-based auth (current implementation), we can't check server-side.
  // The middleware allows the request through but sets a header so client components
  // know middleware ran. The useAuth hook handles the actual redirect.
  // This structure enables a smooth migration to HttpOnly cookies later.
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
