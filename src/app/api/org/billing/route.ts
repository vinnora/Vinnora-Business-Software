import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { getAuthContext, isOwner, handleAuthError } from '@/lib/auth-helpers';
import Organization, { ALL_APPS } from '@/models/Organization';
import User from '@/models/User';

export async function GET() {
  try {
    const ctx = await getAuthContext();
    await dbConnect();
    const org = await Organization.findById(ctx.orgId);
    if (!org) return NextResponse.json(null);

    const seatCount = await User.countDocuments({ orgId: ctx.orgId });

    return NextResponse.json({
      plan: org.plan,
      apps: org.apps,
      maxSeats: org.maxSeats,
      usedSeats: seatCount,
      billingCycle: org.billingCycle,
      billingEmail: org.billingEmail,
      monthlyRate: org.monthlyRate,
      nextRenewal: org.nextRenewal,
      trialEndsAt: org.trialEndsAt,
    });
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const ctx = await getAuthContext();
    if (!isOwner(ctx)) return NextResponse.json({ error: 'Only the owner can change billing' }, { status: 403 });
    await dbConnect();
    const body = await req.json();
    const { plan, apps, billingCycle } = body;

    const updates: any = {};

    if (plan) {
      updates.plan = plan;
      if (plan === 'free') {
        updates.maxSeats = 1;
        updates.billingCycle = 'none';
        updates.monthlyRate = 0;
        // Keep only first app
        updates.apps = apps?.slice(0, 1) || ctx.org.apps.slice(0, 1);
      } else if (plan === 'custom') {
        const selectedApps = apps || ctx.org.apps;
        updates.apps = selectedApps.slice(0, 6); // max 6
        updates.maxSeats = 50;
        const cycle = billingCycle || 'monthly';
        updates.billingCycle = cycle;
        const perApp = cycle === 'yearly' ? 75 : 90;
        updates.monthlyRate = selectedApps.length * perApp;
        if (cycle === 'yearly') {
          updates.nextRenewal = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
        } else {
          updates.nextRenewal = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        }
      } else if (plan === 'all-in-one') {
        updates.apps = [...ALL_APPS];
        updates.maxSeats = 100;
        const cycle = billingCycle || 'monthly';
        updates.billingCycle = cycle;
        updates.monthlyRate = cycle === 'yearly' ? 374 : 499;
        if (cycle === 'yearly') {
          updates.nextRenewal = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
        } else {
          updates.nextRenewal = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        }
      }
    }

    if (apps && !plan) updates.apps = apps;
    if (billingCycle && !plan) updates.billingCycle = billingCycle;

    const org = await Organization.findByIdAndUpdate(ctx.orgId, updates, { new: true });
    return NextResponse.json(org);
  } catch (error) {
    return handleAuthError(error);
  }
}
