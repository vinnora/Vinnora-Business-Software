import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import ChannelMessage, { ChannelType } from '@/models/ChannelMessage';
import Case from '@/models/Case';
import Contact from '@/models/Contact';
import Organization from '@/models/Organization';
import User from '@/models/User';
import { analyzeSentiment } from '@/lib/insights';
import { runWorkflows } from '@/lib/workflows';
import { getTenant, apiError } from '@/lib/tenant';

type Filter = Record<string, unknown>;

interface InboundScope {
  orgId: string;
  userId: string;
  where(extra?: Filter): Filter;
}

/**
 * Work out which workspace an inbound message belongs to.
 * Signed in: the user's workspace. Signed out (public website ticket form): the workspace named by
 * its slug in `workspace` (JSON body) or `?workspace=`. Any orgId/userId sent by the client is ignored.
 */
async function resolveScope(req: NextRequest, body: Record<string, unknown>): Promise<InboundScope | null> {
  const session = await getServerSession(authOptions);
  if (session?.user?.id) {
    const t = await getTenant('sales-service');
    t.requireWrite();
    return { orgId: t.orgId, userId: t.stamp().userId, where: t.where };
  }

  const slug = body.workspace || new URL(req.url).searchParams.get('workspace');
  if (!slug || typeof slug !== 'string') return null;
  const org = await Organization.findOne({ slug: slug.trim() }).lean<{ _id: unknown; ownerId: string }>();
  if (!org) return null;

  const orgId = String(org._id);
  // Same visibility rule as getTenant: workspace records, plus legacy records owned by a member.
  const members = await User.find({ orgId }).select('email').lean<{ _id: unknown; email?: string }[]>();
  const ownerKeys = [...new Set(members.flatMap((m) => [String(m._id), m.email || '']).filter(Boolean))];
  const base: Filter = { $or: [{ orgId }, { orgId: { $in: [null, ''] }, userId: { $in: ownerKeys } }] };

  return {
    orgId,
    userId: String(org.ownerId),
    where: (extra?: Filter) => (extra && Object.keys(extra).length ? { $and: [base, extra] } : base),
  };
}

const CHANNELS: ChannelType[] = ['email', 'web', 'chat', 'phone', 'social', 'sms'];

/** Read a JSON body or a plain HTML form post (the website ticket form snippet posts form-encoded). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type InboundBody = Record<string, any>;

async function readBody(req: NextRequest): Promise<InboundBody> {
  const type = req.headers.get('content-type') || '';
  if (type.includes('application/x-www-form-urlencoded') || type.includes('multipart/form-data')) {
    const form = await req.formData();
    const out: InboundBody = {};
    form.forEach((v, k) => {
      if (typeof v === 'string') out[k] = v;
    });
    return out;
  }
  const json = await req.json().catch(() => null);
  return json && typeof json === 'object' ? json : {};
}

/**
 * Omnichannel inbound endpoint. Accepts messages from email, web form,
 * chat, phone notes, social, sms — auto-creates a Case and a ChannelMessage
 * record. Used by web-to-case forms or external listeners.
 *
 * POST body: { channel, fromName, fromAddress, subject, body, raw?, workspace? }
 * `workspace` (the workspace slug) is required when the caller is not signed in.
 */
export async function POST(req: NextRequest) {
  try {
    await dbConnect();

    const body = await readBody(req);
    const scope = await resolveScope(req, body);
    if (!scope) {
      return NextResponse.json({ error: 'Unknown workspace' }, { status: 400 });
    }
    const owner = { orgId: scope.orgId, userId: scope.userId };

    if (!body.channel || !body.body || typeof body.body !== 'string') {
      return NextResponse.json({ error: 'channel and body required' }, { status: 400 });
    }
    if (!CHANNELS.includes(body.channel as ChannelType)) {
      return NextResponse.json({ error: `channel must be one of: ${CHANNELS.join(', ')}` }, { status: 400 });
    }

    const channel = body.channel as ChannelType;
    const sentiment = analyzeSentiment(body.body).sentiment;

    // Try to match an existing contact by email
    let contact;
    if (body.fromAddress) {
      contact = await Contact.findOne(scope.where({ email: body.fromAddress }));
    }

    // Decide priority by sentiment + keywords
    const lower = body.body.toLowerCase();
    let priority: 'Low' | 'Medium' | 'High' | 'Critical' = 'Medium';
    if (lower.includes('urgent') || lower.includes('critical') || lower.includes('down')) {
      priority = 'Critical';
    } else if (sentiment === 'negative') {
      priority = 'High';
    }

    const caseNumber = `CASE-${new Date().getFullYear()}-${Math.floor(Math.random() * 100000)
      .toString()
      .padStart(5, '0')}`;

    const originMap: Record<ChannelType, string> = {
      email: 'Email',
      web: 'Web',
      chat: 'Chat',
      phone: 'Phone',
      social: 'Social',
      sms: 'Chat',
    };

    const newCase = await Case.create({
      ...owner,
      caseNumber,
      subject: body.subject || `Inbound ${channel} from ${body.fromName || body.fromAddress || 'unknown'}`,
      description: body.body,
      origin: originMap[channel],
      priority,
      status: 'New',
      contactId: contact ? String(contact._id) : undefined,
      contactName: contact ? `${contact.firstName} ${contact.lastName}` : body.fromName,
      contactEmail: body.fromAddress,
      accountId: contact?.accountId,
      accountName: contact?.accountName,
    });

    const message = await ChannelMessage.create({
      ...owner,
      channel,
      fromName: body.fromName,
      fromAddress: body.fromAddress,
      subject: body.subject,
      body: body.body,
      caseId: String(newCase._id),
      contactId: contact ? String(contact._id) : undefined,
      processed: true,
      sentiment,
      raw: body.raw,
    });

    // Trigger workflows on the new case
    await runWorkflows({
      objectType: 'Case',
      event: 'created',
      record: newCase,
      userId: owner.userId,
      orgId: owner.orgId,
    });

    return NextResponse.json({ case: newCase, message }, { status: 201 });
  } catch (error) {
    return apiError(error, 'Inbound channel error:');
  }
}

export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    const t = await getTenant('sales-service');
    const { searchParams } = new URL(req.url);
    const caseId = searchParams.get('caseId');
    const filter: Filter = {};
    if (caseId) filter.caseId = caseId;
    const messages = await ChannelMessage.find(t.where(filter)).sort({ receivedAt: -1 }).limit(100);
    return NextResponse.json(messages);
  } catch (error) {
    return apiError(error, 'Error fetching channel messages:');
  }
}
