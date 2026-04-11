import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { getAuthContext, canAdmin, handleAuthError } from '@/lib/auth-helpers';
import Organization from '@/models/Organization';

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-' + Math.random().toString(36).slice(2, 6);
}

export async function GET() {
  try {
    const ctx = await getAuthContext();
    if (!ctx.orgId || ctx.orgId === 'dev-org-id') {
      return NextResponse.json(null);
    }
    await dbConnect();
    const org = await Organization.findById(ctx.orgId);
    return NextResponse.json(org);
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const ctx = await getAuthContext();
    const body = await req.json();
    if (!body.name) return NextResponse.json({ error: 'name required' }, { status: 400 });

    const User = (await import('@/models/User')).default;
    const org = await Organization.create({
      name: body.name,
      slug: slugify(body.name),
      ownerId: ctx.userId,
      plan: body.plan || 'free',
      apps: body.apps || ['sales-service'],
      maxSeats: body.plan === 'all-in-one' ? 50 : body.plan === 'custom' ? 10 : 1,
      billingCycle: body.billingCycle || 'none',
      billingEmail: body.billingEmail || ctx.user?.email,
      monthlyRate: body.monthlyRate || 0,
    });

    await User.findByIdAndUpdate(ctx.userId, {
      orgId: org._id.toString(),
      orgRole: 'owner',
    });

    return NextResponse.json(org, { status: 201 });
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
    const { name, slug, billingEmail } = body;
    const updates: any = {};
    if (name) updates.name = name;
    if (slug) updates.slug = slug;
    if (billingEmail) updates.billingEmail = billingEmail;
    const org = await Organization.findByIdAndUpdate(ctx.orgId, updates, { new: true });
    return NextResponse.json(org);
  } catch (error) {
    return handleAuthError(error);
  }
}
