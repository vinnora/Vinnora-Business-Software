import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import Account from '@/models/Account';
import Contact from '@/models/Contact';
import Opportunity from '@/models/Opportunity';
import Case from '@/models/Case';
import Activity from '@/models/Activity';

/**
 * 360-degree view: returns the account plus all related child records.
 */
export async function GET(_req: NextRequest, ctx: RouteContext<'/api/sales-service/accounts/[id]'>) {
  try {
    await dbConnect();
    const session = await getServerSession(authOptions);
    const userId = session?.user?.email || 'dev-user-id';
    const { id } = await ctx.params;

    const account = await Account.findOne({ _id: id, userId });
    if (!account) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const [contacts, opportunities, cases, activities] = await Promise.all([
      Contact.find({ userId, accountId: id }).sort({ updatedAt: -1 }).limit(50),
      Opportunity.find({ userId, accountId: id }).sort({ closeDate: 1 }).limit(50),
      Case.find({ userId, accountId: id }).sort({ createdAt: -1 }).limit(50),
      Activity.find({
        userId,
        $or: [
          { relatedToType: 'Account', relatedToId: id },
        ],
      })
        .sort({ createdAt: -1 })
        .limit(50),
    ]);

    return NextResponse.json({ account, contacts, opportunities, cases, activities });
  } catch (error) {
    console.error('Error fetching account 360:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
