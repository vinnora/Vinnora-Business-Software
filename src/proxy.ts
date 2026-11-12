import { NextRequest, NextResponse } from 'next/server';

const ENV_COOKIE = 'vinnora-env';

/**
 * APIs that are environment-aware. While a sandbox is active, every other API is refused,
 * because modules not yet connected to the platform would read/write production data.
 */
const SANDBOX_SAFE_API = [
  /^\/api\/auth(\/|$)/,
  /^\/api\/platform(\/|$)/,
  /^\/api\/me(\/|$)/, // the user's own account, not workspace data
  /^\/api\/org(\/members|\/invitations)?(\/|$)/,
  /^\/api\/sales-service\/(leads|contacts|accounts|opportunities|cases)(\/|$)/,
];

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith('/api/') && req.cookies.get(ENV_COOKIE)?.value) {
    if (pathname === '/api/org/billing' || !SANDBOX_SAFE_API.some((re) => re.test(pathname))) {
      return NextResponse.json(
        {
          error:
            'This part of Vinnora is not available in a test workspace yet. Switch back to Production to use it.',
          code: 'SANDBOX_UNSUPPORTED',
        },
        { status: 409 },
      );
    }
  }

  // Sign-in is required unless the dev bypass is explicitly enabled (never in production).
  const bypass = process.env.VINNORA_DEV_AUTH_BYPASS === 'true' && process.env.NODE_ENV !== 'production';
  // The All Apps dashboard is open to everyone; each app (and Settings/Reports) needs a sign-in.
  const isPublic = PUBLIC_PAGES.has(pathname) || PUBLIC_API.some((re) => re.test(pathname));
  if (!bypass && !hasSessionCookie(req) && !isPublic) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Please sign in' }, { status: 401 });
    }
    const signIn = new URL('/auth/signin', req.url);
    signIn.searchParams.set('callbackUrl', pathname + req.nextUrl.search);
    return NextResponse.redirect(signIn);
  }

  return NextResponse.next();
}

/** Pages reachable without signing in (the All Apps dashboard). */
const PUBLIC_PAGES = new Set(['/dashboard', '/dashboard/']);

/** APIs reachable without signing in. */
const PUBLIC_API = [/^\/api\/auth(\/|$)/, /^\/api\/sales-service\/channel-inbound$/];

function hasSessionCookie(req: NextRequest): boolean {
  return Boolean(
    req.cookies.get('next-auth.session-token')?.value || req.cookies.get('__Secure-next-auth.session-token')?.value,
  );
}

export const config = {
  matcher: ['/dashboard/:path*', '/api/:path*'],
};
