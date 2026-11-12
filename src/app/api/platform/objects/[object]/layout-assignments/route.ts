import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import Profile from '@/models/Profile';
import PageLayout from '@/models/PageLayout';
import LayoutAssignment from '@/models/LayoutAssignment';
import { route, setupContext, readJson, VIEW_SETUP } from '@/lib/platform/api';
import { describeObject } from '@/lib/platform/metadata';
import { ensureSystemProfiles } from '@/lib/platform/access';
import { BadRequestError } from '@/lib/platform/errors';

type P = { object: string };

/** GET — every profile with the layout it sees for this object (null = default layout). */
export const GET = route<P>(async (_req, { object }) => {
  const { tenant } = await setupContext(...VIEW_SETUP);
  const describe = await describeObject(tenant, object);
  await ensureSystemProfiles(tenant);
  const [profiles, assignments] = await Promise.all([
    Profile.find({ orgId: tenant }).select('name key isSystem').sort({ isSystem: -1, name: 1 }).lean(),
    LayoutAssignment.find({ orgId: tenant, objectApiName: describe.apiName }).lean(),
  ]);
  const byProfile = new Map(assignments.map((a) => [a.profileId, a.layoutId]));
  return NextResponse.json(
    profiles.map((p) => ({ profileId: String(p._id), profileName: p.name, isSystem: p.isSystem, layoutId: byProfile.get(String(p._id)) || null })),
  );
});

/** PUT { assignments: { [profileId]: layoutId | null } } */
export const PUT = route<P>(async (req, { object }) => {
  const { tenant } = await setupContext('customizeApplication');
  const describe = await describeObject(tenant, object);
  const body = await readJson<{ assignments?: Record<string, string | null> }>(req);
  const entries = Object.entries(body.assignments || {});
  const layoutIds = entries.map(([, l]) => l).filter((l): l is string => Boolean(l));
  if (layoutIds.some((l) => !mongoose.isValidObjectId(l))) throw new BadRequestError('Invalid form layout');
  const valid = new Set(
    (await PageLayout.find({ _id: { $in: layoutIds }, orgId: tenant, objectApiName: describe.apiName }).select('_id').lean()).map((l) => String(l._id)),
  );
  for (const [profileId, layoutId] of entries) {
    if (!mongoose.isValidObjectId(profileId)) continue;
    if (!layoutId) {
      await LayoutAssignment.deleteOne({ orgId: tenant, objectApiName: describe.apiName, profileId });
      continue;
    }
    if (!valid.has(layoutId)) throw new BadRequestError('Form layout not found for this module');
    await LayoutAssignment.updateOne(
      { orgId: tenant, objectApiName: describe.apiName, profileId },
      { $set: { layoutId } },
      { upsert: true },
    );
  }
  return NextResponse.json({ success: true });
});
