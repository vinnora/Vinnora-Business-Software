import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// PRESERVED — not wired up. Sign-in is now enforced by src/proxy.ts (set
// VINNORA_DEV_AUTH_BYPASS=true in development to skip it). Kept for reference only.
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check for NextAuth session token
  const token =
    request.cookies.get('next-auth.session-token')?.value ||
    request.cookies.get('__Secure-next-auth.session-token')?.value;

  // Protect dashboard routes
  if (pathname.startsWith('/dashboard')) {
    if (!token) {
      const signInUrl = new URL('/auth/signin', request.url);
      signInUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(signInUrl);
    }
  }

  // Protect API routes (except auth, seed-defaults, migrate)
  if (pathname.startsWith('/api') && !pathname.startsWith('/api/auth') && !pathname.startsWith('/api/seed-defaults') && !pathname.startsWith('/api/migrate')) {
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/api/((?!auth|seed-defaults|migrate).*)'],
};
