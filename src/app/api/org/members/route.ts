import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { getAuthContext, canAdmin, handleAuthError } from '@/lib/auth-helpers';
import User from '@/models/User';

export async function GET() {
  try {
    const ctx = await getAuthContext();
    await dbConnect();
    const members = await User.find({ orgId: ctx.orgId }).select('-password').sort({ orgRole: 1, name: 1 });
    return NextResponse.json(members);
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const ctx = await getAuthContext();
    if (!canAdmin(ctx)) return NextResponse.json({ error: 'Admin required' }, { status: 403 });
    await dbConnect();
    const body = await req.json();
    const { userId, orgRole, appRoles } = body;
    if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });

    const target = await User.findById(userId);
    if (!target || target.orgId !== ctx.orgId) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }
    if (target.orgRole === 'owner' && ctx.orgRole !== 'owner') {
      return NextResponse.json({ error: 'Cannot modify owner' }, { status: 403 });
    }

    const updates: any = {};
    if (orgRole && orgRole !== 'owner') updates.orgRole = orgRole;
    if (appRoles) updates.appRoles = appRoles;
    const updated = await User.findByIdAndUpdate(userId, updates, { new: true }).select('-password');
    return NextResponse.json(updated);
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
    const userId = searchParams.get('userId');
    if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });

    const target = await User.findById(userId);
    if (!target || target.orgId !== ctx.orgId) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }
    if (target.orgRole === 'owner') {
      return NextResponse.json({ error: 'Cannot remove owner' }, { status: 403 });
    }

    await User.findByIdAndUpdate(userId, { orgId: null, orgRole: 'member', appRoles: {} });
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleAuthError(error);
  }
}
