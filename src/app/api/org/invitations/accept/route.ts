import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Invitation from '@/models/Invitation';
import User from '@/models/User';

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const body = await req.json();
    const { token } = body;
    if (!token) return NextResponse.json({ error: 'token required' }, { status: 400 });

    const invitation = await Invitation.findOne({ token, status: 'pending' });
    if (!invitation) return NextResponse.json({ error: 'Invalid or expired invitation' }, { status: 404 });

    if (new Date() > invitation.expiresAt) {
      await Invitation.findByIdAndUpdate(invitation._id, { status: 'expired' });
      return NextResponse.json({ error: 'Invitation has expired' }, { status: 410 });
    }

    // Find or validate the user accepting the invite
    const user = await User.findOne({ email: invitation.email });
    if (!user) {
      return NextResponse.json({ error: 'Please sign up first with the invited email address', needsSignup: true, email: invitation.email }, { status: 400 });
    }

    // Update user to join the org
    await User.findByIdAndUpdate(user._id, {
      orgId: invitation.orgId,
      orgRole: invitation.orgRole,
      appRoles: invitation.appRoles || {},
    });

    // Mark invitation as accepted
    await Invitation.findByIdAndUpdate(invitation._id, {
      status: 'accepted',
      acceptedAt: new Date(),
    });

    return NextResponse.json({ success: true, orgId: invitation.orgId });
  } catch (error) {
    console.error('Accept invitation error:', error);
    return NextResponse.json({ error: 'Failed to accept invitation' }, { status: 500 });
  }
}
