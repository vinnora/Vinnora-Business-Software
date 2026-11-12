import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getAuthContext, handleAuthError } from '@/lib/auth-helpers';
import User from '@/models/User';

/** POST — change the signed-in user's password (requires the current one). */
export async function POST(req: NextRequest) {
  try {
    const ctx = await getAuthContext();
    if (ctx.userId === 'dev-user-id') return NextResponse.json({ error: 'Sign in to change your password.' }, { status: 400 });
    const body = await req.json().catch(() => ({}));
    const current = typeof body.currentPassword === 'string' ? body.currentPassword : '';
    const next = typeof body.newPassword === 'string' ? body.newPassword : '';
    if (next.length < 8) return NextResponse.json({ error: 'New password must be at least 8 characters.' }, { status: 400 });

    const user = await User.findById(ctx.userId).select('password');
    if (!user || !(await bcrypt.compare(current, user.password))) {
      return NextResponse.json({ error: 'Current password is incorrect.' }, { status: 400 });
    }
    if (await bcrypt.compare(next, user.password)) {
      return NextResponse.json({ error: 'New password must be different from the current one.' }, { status: 400 });
    }
    user.password = await bcrypt.hash(next, 12);
    await user.save();
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleAuthError(error);
  }
}
