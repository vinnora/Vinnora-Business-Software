import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import Organization, { ALL_APPS } from '@/models/Organization';
import Invitation from '@/models/Invitation';

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-' + Math.random().toString(36).slice(2, 6);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, password, company, inviteToken, selectedApp } = body;

    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    await dbConnect();

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return NextResponse.json({ error: 'User already exists' }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    // Check if user is accepting an invitation
    if (inviteToken) {
      const invitation = await Invitation.findOne({ token: inviteToken, status: 'pending' });
      if (!invitation || invitation.email !== email) {
        return NextResponse.json({ error: 'Invalid invitation. Please use the invited email address.' }, { status: 400 });
      }
      if (new Date() > invitation.expiresAt) {
        await Invitation.findByIdAndUpdate(invitation._id, { status: 'expired' });
        return NextResponse.json({ error: 'Invitation has expired' }, { status: 410 });
      }

      // Create user and join existing org
      await User.create({
        name,
        email,
        password: hashedPassword,
        company: company || '',
        orgId: invitation.orgId,
        orgRole: invitation.orgRole || 'member',
        appRoles: invitation.appRoles || {},
        modules: [],
      });

      await Invitation.findByIdAndUpdate(invitation._id, { status: 'accepted', acceptedAt: new Date() });

      return NextResponse.json({ message: 'Account created and joined organization' }, { status: 201 });
    }

    // No invite — create new user + organization
    const firstApp = selectedApp || 'sales-service';
    const orgName = company || `${name}'s Workspace`;

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      company: company || '',
      orgRole: 'owner',
      subscription: 'free',
      modules: [firstApp],
    });

    const org = await Organization.create({
      name: orgName,
      slug: slugify(orgName),
      ownerId: user._id.toString(),
      plan: 'free',
      apps: [firstApp],
      maxSeats: 1,
      billingCycle: 'none',
      billingEmail: email,
      monthlyRate: 0,
    });

    await User.findByIdAndUpdate(user._id, { orgId: org._id.toString() });

    return NextResponse.json({ message: 'Account and workspace created successfully' }, { status: 201 });
  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
