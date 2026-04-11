import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import ChannelMessage, { ChannelType } from '@/models/ChannelMessage';
import Case from '@/models/Case';
import Contact from '@/models/Contact';
import { analyzeSentiment } from '@/lib/insights';
import { runWorkflows } from '@/lib/workflows';

/**
 * Omnichannel inbound endpoint. Accepts messages from email, web form,
 * chat, phone notes, social, sms — auto-creates a Case and a ChannelMessage
 * record. Used by web-to-case forms or external listeners.
 *
 * POST body: { channel, fromName, fromAddress, subject, body, raw? }
 */
export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const session = await getServerSession(authOptions);
    const userId = session?.user?.email || 'dev-user-id';

    const body = await req.json();
    if (!body.channel || !body.body) {
      return NextResponse.json({ error: 'channel and body required' }, { status: 400 });
    }

    const channel = body.channel as ChannelType;
    const sentiment = analyzeSentiment(body.body).sentiment;

    // Try to match an existing contact by email
    let contact;
    if (body.fromAddress) {
      contact = await Contact.findOne({ userId, email: body.fromAddress });
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
      userId,
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
      userId,
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
      userId,
    });

    return NextResponse.json({ case: newCase, message }, { status: 201 });
  } catch (error) {
    console.error('Inbound channel error:', error);
    return NextResponse.json({ error: 'Inbound failed' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    const session = await getServerSession(authOptions);
    const userId = session?.user?.email || 'dev-user-id';
    const { searchParams } = new URL(req.url);
    const caseId = searchParams.get('caseId');
    const filter: any = { userId };
    if (caseId) filter.caseId = caseId;
    const messages = await ChannelMessage.find(filter).sort({ receivedAt: -1 }).limit(100);
    return NextResponse.json(messages);
  } catch (error) {
    return NextResponse.json([], { status: 200 });
  }
}
