import { NextRequest, NextResponse } from 'next/server';

export function proxy(req: NextRequest) {
  // Bypass authentication during development
  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*'],
};
