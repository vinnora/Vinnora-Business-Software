import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import Lead from '@/models/Lead';
import Account from '@/models/Account';
import Contact from '@/models/Contact';
import Opportunity from '@/models/Opportunity';
import { runWorkflows } from '@/lib/workflows';

export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    const session = await getServerSession(authOptions);
    const userId = session?.user?.email || 'dev-user-id';

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    const filter: any = { userId };
    if (status) filter.status = status;
    if (search) {
      filter.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { company: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const leads = await Lead.find(filter).sort({ updatedAt: -1 }).limit(200);
    return NextResponse.json(leads);
  } catch (error) {
    console.error('Error fetching leads:', error);
    return NextResponse.json([], { status: 200 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const session = await getServerSession(authOptions);
    const userId = session?.user?.email || 'dev-user-id';

    const body = await req.json();

    // Lead conversion: { action: 'convert', leadId, opportunityName?, amount?, closeDate? }
    if (body.action === 'convert' && body.leadId) {
      const lead = await Lead.findById(body.leadId);
      if (!lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 });

      const account = await Account.create({
        userId,
        name: lead.company || `${lead.firstName} ${lead.lastName}`,
        type: 'Customer',
        industry: lead.industry,
        phone: lead.phone,
        annualRevenue: lead.annualRevenue,
        employees: lead.numberOfEmployees,
        billingCity: lead.city,
        billingState: lead.state,
        billingCountry: lead.country,
        ownerId: lead.ownerId,
        ownerName: lead.ownerName,
      });

      const contact = await Contact.create({
        userId,
        firstName: lead.firstName,
        lastName: lead.lastName,
        title: lead.title,
        email: lead.email,
        phone: lead.phone,
        mobile: lead.mobile,
        accountId: String(account._id),
        accountName: account.name,
        leadSource: lead.leadSource,
        ownerId: lead.ownerId,
        ownerName: lead.ownerName,
      });

      let opportunity = null;
      if (body.createOpportunity !== false) {
        opportunity = await Opportunity.create({
          userId,
          name: body.opportunityName || `${account.name} - New Opportunity`,
          accountId: String(account._id),
          accountName: account.name,
          contactId: String(contact._id),
          contactName: `${contact.firstName} ${contact.lastName}`,
          amount: body.amount || 0,
          closeDate: body.closeDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          stage: 'Qualification',
          probability: 20,
          leadSource: lead.leadSource,
          ownerId: lead.ownerId,
          ownerName: lead.ownerName,
        });
      }

      lead.status = 'Converted';
      lead.convertedAt = new Date();
      lead.convertedAccountId = String(account._id);
      lead.convertedContactId = String(contact._id);
      if (opportunity) lead.convertedOpportunityId = String(opportunity._id);
      await lead.save();

      return NextResponse.json({ lead, account, contact, opportunity });
    }

    if (!body.firstName || !body.lastName) {
      return NextResponse.json(
        { error: 'firstName and lastName are required' },
        { status: 400 }
      );
    }

    const lead = await Lead.create({ ...body, userId });
    await runWorkflows({ objectType: 'Lead', event: 'created', record: lead, userId });
    return NextResponse.json(lead, { status: 201 });
  } catch (error) {
    console.error('Error creating lead:', error);
    return NextResponse.json({ error: 'Failed to create lead' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await dbConnect();
    const body = await req.json();
    const { _id, ...updates } = body;
    if (!_id) return NextResponse.json({ error: '_id required' }, { status: 400 });
    const lead = await Lead.findByIdAndUpdate(_id, updates, { new: true });
    if (lead) {
      await runWorkflows({
        objectType: 'Lead',
        event: 'fieldChanged',
        record: lead,
        userId: lead.userId,
        changedFields: Object.keys(updates),
      });
    }
    return NextResponse.json(lead);
  } catch (error) {
    console.error('Error updating lead:', error);
    return NextResponse.json({ error: 'Failed to update lead' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
    await Lead.findByIdAndDelete(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting lead:', error);
    return NextResponse.json({ error: 'Failed to delete lead' }, { status: 500 });
  }
}
