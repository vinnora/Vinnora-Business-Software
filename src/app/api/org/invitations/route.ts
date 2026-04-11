import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import dbConnect from '@/lib/mongodb';
import { getAuthContext, canAdmin, handleAuthError } from '@/lib/auth-helpers';
import Invitation from '@/models/Invitation';

export async function GET() {
  try {
    const ctx = await getAuthContext();
    if (!canAdmin(ctx)) return NextResponse.json({ error: 'Admin required' }, { status: 403 });
    await dbConnect();
    const items = await Invitation.find({ orgId: ctx.orgId, status: 'pending' }).sort({ createdAt: -1 });
    return NextResponse.json(items);
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await getAuthContext();
    if (!canAdmin(ctx)) return NextResponse.json({ error: 'Admin required' }, { status: 403 });
    await dbConnect();
    const body = await req.json();
    if (!body.email) return NextResponse.json({ error: 'email required' }, { status: 400 });

    // Check if already invited
    const existing = await Invitation.findOne({ orgId: ctx.orgId, email: body.email, status: 'pending' });
    if (existing) return NextResponse.json({ error: 'Already invited' }, { status: 400 });

    const invitation = await Invitation.create({
      orgId: ctx.orgId,
      email: body.email,
      orgRole: body.orgRole || 'member',
      appRoles: body.appRoles || {},
      invitedBy: ctx.userId,
      token: crypto.randomUUID(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    });

    return NextResponse.json(invitation, { status: 201 });
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const ctx = await getAuthContext();
    if (!canAdmin(ctx)) return NextResponse.json({ error: 'Admin required' }, { status: 403 });
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
    await Invitation.findByIdAndUpdate(id, { status: 'revoked' });
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleAuthError(error);
  }
}
