import { NextResponse } from 'next/server';
import Deployment from '@/models/Deployment';
import { productionContext, route } from '@/lib/platform/api';

/** GET — deployment history for production (snapshots omitted). */
export const GET = route(async () => {
  const { prodTenant } = await productionContext('manageSandboxes');
  const list = await Deployment.find({ orgId: prodTenant }).select('-snapshot').sort({ createdAt: -1 }).limit(100).lean();
  return NextResponse.json(list.map((d) => ({ ...d, _id: String(d._id) })));
});
