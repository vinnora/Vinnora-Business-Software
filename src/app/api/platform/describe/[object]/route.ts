import { NextResponse } from 'next/server';
import { getAuthContext } from '@/lib/auth-helpers';
import { route } from '@/lib/platform/api';
import { describeForUser } from '@/lib/platform/describe';

type P = { object: string };

/** GET — object metadata, the user's access and their assigned page layout. */
export const GET = route<P>(async (_req, { object }) => {
  const ctx = await getAuthContext();
  return NextResponse.json(await describeForUser(ctx, object));
});
