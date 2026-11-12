import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { getAuthContext, type AuthContext } from '@/lib/auth-helpers';
import { getObjectAccess, buildCreateDoc, buildUpdate } from '@/lib/platform/access';
import { legacyOwnerKey, tenantOf } from '@/lib/platform/metadata';
import { BadRequestError, NotFoundError, platformErrorResponse } from '@/lib/platform/errors';
import Lead from '@/models/Lead';
import Account from '@/models/Account';
import Contact from '@/models/Contact';
import Opportunity from '@/models/Opportunity';
import { runWorkflows } from '@/lib/workflows';

/** Drop undefined keys so mapped-but-empty lead fields don't overwrite schema defaults with null. */
function defined(obj: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));
}

async function findVisibleLead(ctx: AuthContext, id: unknown) {
  const access = await getObjectAccess(ctx, 'Lead');
  if (!mongoose.isValidObjectId(id)) throw new BadRequestError('Invalid lead id');
  const lead = await Lead.findOne({ $and: [{ _id: id }, await access.readFilter()] });
  if (!lead) throw new NotFoundError('Lead not found');
  return lead;
}

/** Lead conversion: { action: 'convert', leadId, createOpportunity?, opportunityName?, amount?, closeDate? } */
async function convertLead(ctx: AuthContext, body: Record<string, unknown>) {
  const [leadAccess, accountAccess, contactAccess, oppAccess] = await Promise.all([
    getObjectAccess(ctx, 'Lead'),
    getObjectAccess(ctx, 'Account'),
    getObjectAccess(ctx, 'Contact'),
    getObjectAccess(ctx, 'Opportunity'),
  ]);
  leadAccess.assert('edit');
  const lead = await findVisibleLead(ctx, body.leadId);
  const createOpp = body.createOpportunity !== false;

  // Pre-allocate ids so the child records can reference each other before anything is written.
  const accountId = new mongoose.Types.ObjectId();
  const contactId = new mongoose.Types.ObjectId();
  const accountName = lead.company || `${lead.firstName} ${lead.lastName}`;

  // Validate every target first so errors surface before anything is written.
  const accountPrep = await accountAccess.prepareWrite(
    defined({
      name: accountName,
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
    }),
    undefined,
    { passthrough: true },
  );
  const contactPrep = await contactAccess.prepareWrite(
    defined({
      firstName: lead.firstName,
      lastName: lead.lastName,
      title: lead.title,
      email: lead.email,
      phone: lead.phone,
      mobile: lead.mobile,
      accountId: String(accountId),
      accountName,
      leadSource: lead.leadSource,
      ownerId: lead.ownerId,
      ownerName: lead.ownerName,
    }),
    undefined,
    { passthrough: true },
  );
  const oppPrep = createOpp
    ? await oppAccess.prepareWrite(
        defined({
          name: body.opportunityName || `${accountName} - New Opportunity`,
          accountId: String(accountId),
          accountName,
          contactId: String(contactId),
          contactName: `${lead.firstName} ${lead.lastName}`,
          amount: body.amount || 0,
          closeDate: body.closeDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          stage: 'Qualification',
          leadSource: lead.leadSource,
          ownerId: lead.ownerId,
          ownerName: lead.ownerName,
        }),
        undefined,
        { passthrough: true },
      )
    : null;

  const account = await Account.create(buildCreateDoc(accountAccess, accountPrep, { _id: accountId }));
  const contact = await Contact.create(buildCreateDoc(contactAccess, contactPrep, { _id: contactId }));
  const opportunity = oppPrep
    ? await Opportunity.create(buildCreateDoc(oppAccess, oppPrep, { probability: 20 }))
    : null;

  const leadSet: Record<string, unknown> = {
    status: 'Converted',
    convertedAt: new Date(),
    convertedAccountId: String(account._id),
    convertedContactId: String(contact._id),
    orgId: tenantOf(ctx),
  };
  if (opportunity) leadSet.convertedOpportunityId = String(opportunity._id);
  const updatedLead = await Lead.findByIdAndUpdate(lead._id, { $set: leadSet }, { new: true });

  return {
    lead: leadAccess.shape(updatedLead),
    account: accountAccess.shape(account),
    contact: contactAccess.shape(contact),
    opportunity: opportunity ? oppAccess.shape(opportunity) : null,
  };
}

export async function GET(req: NextRequest) {
  try {
    const ctx = await getAuthContext('sales-service');
    const access = await getObjectAccess(ctx, 'Lead');
    access.assert('read');

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    const filter: Record<string, unknown> = {};
    if (status) filter.status = status;
    if (search) {
      filter.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { company: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const leads = await Lead.find({ $and: [await access.readFilter(), filter] })
      .sort({ updatedAt: -1 })
      .limit(200);
    return NextResponse.json(access.shapeMany(leads));
  } catch (error) {
    return platformErrorResponse(error, 'Error fetching leads:');
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await getAuthContext('sales-service');
    const body = await req.json();

    if (body.action === 'convert' && body.leadId) {
      return NextResponse.json(await convertLead(ctx, body));
    }

    const access = await getObjectAccess(ctx, 'Lead');
    const prepared = await access.prepareWrite(body, undefined, { passthrough: true });
    const lead = await Lead.create(buildCreateDoc(access, prepared));
    await runWorkflows({
      objectType: 'Lead',
      event: 'created',
      record: lead,
      userId: legacyOwnerKey(ctx),
      orgId: tenantOf(ctx),
    });
    return NextResponse.json(access.shape(lead), { status: 201 });
  } catch (error) {
    return platformErrorResponse(error, 'Error creating lead:');
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const ctx = await getAuthContext('sales-service');
    const access = await getObjectAccess(ctx, 'Lead');
    const body = await req.json();
    const { _id, ...updates } = body;
    if (!_id) throw new BadRequestError('_id required');

    const existing = await findVisibleLead(ctx, _id);
    const prepared = await access.prepareWrite(updates, existing, { passthrough: true });
    const lead = await Lead.findByIdAndUpdate(_id, buildUpdate(access, prepared), { new: true });
    if (lead) {
      await runWorkflows({
        objectType: 'Lead',
        event: 'fieldChanged',
        record: lead,
        userId: legacyOwnerKey(ctx),
        orgId: tenantOf(ctx),
        changedFields: prepared.changed,
      });
    }
    return NextResponse.json(access.shape(lead));
  } catch (error) {
    return platformErrorResponse(error, 'Error updating lead:');
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const ctx = await getAuthContext('sales-service');
    const access = await getObjectAccess(ctx, 'Lead');
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) throw new BadRequestError('id required');

    const existing = await findVisibleLead(ctx, id);
    access.assert('delete');

    await Lead.deleteOne({ _id: existing._id });
    return NextResponse.json({ success: true });
  } catch (error) {
    return platformErrorResponse(error, 'Error deleting lead:');
  }
}
