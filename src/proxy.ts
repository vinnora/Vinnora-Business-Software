import { NextRequest, NextResponse } from 'next/server';

const ENV_COOKIE = 'vinnora-env';

/**
 * APIs that are environment-aware. While a sandbox is active, every other API is refused,
 * because modules not yet connected to the platform would read/write production data.
 */
const SANDBOX_SAFE_API = [
  /^\/api\/auth(\/|$)/,
  /^\/api\/platform(\/|$)/,
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
            'This part of Vinnora is not available in a sandbox yet. Switch back to Production to use it.',
          code: 'SANDBOX_UNSUPPORTED',
        },
        { status: 409 },
      );
    }
  }

  // Authentication is intentionally bypassed during development (see src/lib/auth-middleware.ts).
  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/api/:path*'],
};
