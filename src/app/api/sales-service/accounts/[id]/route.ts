import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { getAuthContext } from '@/lib/auth-helpers';
import { getObjectAccess, type ObjectAccess } from '@/lib/platform/access';
import { legacyOwnerKey, tenantOf } from '@/lib/platform/metadata';
import { NotFoundError, platformErrorResponse } from '@/lib/platform/errors';
import Account from '@/models/Account';
import Contact from '@/models/Contact';
import Opportunity from '@/models/Opportunity';
import Case from '@/models/Case';
import Activity from '@/models/Activity';

function canRead(access: ObjectAccess) {
  try {
    access.assert('read');
    return true;
  } catch {
    return false;
  }
}

/**
 * 360-degree view: returns the account plus all related child records.
 */
export async function GET(_req: NextRequest, routeCtx: RouteContext<'/api/sales-service/accounts/[id]'>) {
  try {
    const ctx = await getAuthContext('sales-service');
    const { id } = await routeCtx.params;

    const accountAccess = await getObjectAccess(ctx, 'Account');
    accountAccess.assert('read');
    if (!mongoose.isValidObjectId(id)) throw new NotFoundError('Not found');

    const account = await Account.findOne({ $and: [{ _id: id }, await accountAccess.readFilter()] });
    if (!account) throw new NotFoundError('Not found');

    const [contactAccess, oppAccess, caseAccess] = await Promise.all([
      getObjectAccess(ctx, 'Contact'),
      getObjectAccess(ctx, 'Opportunity'),
      getObjectAccess(ctx, 'Case'),
    ]);

    const related = async (access: ObjectAccess, find: (filter: Record<string, unknown>) => Promise<unknown[]>) => {
      if (!canRead(access)) return [];
      const docs = await find({ $and: [await access.readFilter(), { accountId: id }] });
      return access.shapeMany(docs);
    };

    const [contacts, opportunities, cases, activities] = await Promise.all([
      related(contactAccess, (f) => Contact.find(f).sort({ updatedAt: -1 }).limit(50).exec()),
      related(oppAccess, (f) => Opportunity.find(f).sort({ closeDate: 1 }).limit(50).exec()),
      related(caseAccess, (f) => Case.find(f).sort({ createdAt: -1 }).limit(50).exec()),
      // Activities aren't permission-enforced yet: tenant scope only.
      Activity.find({
        $or: [{ orgId: tenantOf(ctx) }, { userId: legacyOwnerKey(ctx) }],
        relatedToType: 'Account',
        relatedToId: id,
      })
        .sort({ createdAt: -1 })
        .limit(50),
    ]);

    return NextResponse.json({ account: accountAccess.shape(account), contacts, opportunities, cases, activities });
  } catch (error) {
    return platformErrorResponse(error, 'Error fetching account 360:');
  }
}
