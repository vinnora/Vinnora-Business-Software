import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import MktEventRegistration from '@/models/MktEventRegistration';
import MktEvent from '@/models/MktEvent';
import { getTenant, sanitize, recordId, apiError, NotFoundError } from '@/lib/tenant';

export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    const t = await getTenant('marketing');
    const { searchParams } = new URL(req.url);
    const eventId = searchParams.get('eventId');
    const status = searchParams.get('status');

    const filter: Record<string, unknown> = {};
    if (eventId) filter.eventId = eventId;
    if (status) filter.status = status;
    const items = await MktEventRegistration.find(t.where(filter)).sort({ createdAt: -1 }).limit(500);
    return NextResponse.json(items);
  } catch (error) {
    return apiError(error, 'Error fetching event registrations:');
  }
}

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const t = await getTenant('marketing');
    t.requireWrite();
    const body = await req.json();
    if (!body.eventId || !body.firstName || !body.lastName || !body.email) {
      return NextResponse.json({ error: 'eventId, firstName, lastName and email required' }, { status: 400 });
    }
    const eventId = recordId(body.eventId);
    const event = await MktEvent.findOne(t.where({ _id: eventId })).select('_id');
    if (!event) throw new NotFoundError('Event not found');

    const reg = await MktEventRegistration.create({ ...sanitize(body), ...t.stamp() });
    await MktEvent.updateOne(t.where({ _id: eventId }), { $inc: { registrationCount: 1 } });
    return NextResponse.json(reg, { status: 201 });
  } catch (error) {
    return apiError(error, 'Error creating event registration:');
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await dbConnect();
    const t = await getTenant('marketing');
    t.requireWrite();
    const body = await req.json();
    const id = recordId(body._id);
    const item = await MktEventRegistration.findOneAndUpdate(t.where({ _id: id }), sanitize(body), { new: true, runValidators: true });
    if (!item) throw new NotFoundError('Registration not found');
    return NextResponse.json(item);
  } catch (error) {
    return apiError(error, 'Error updating event registration:');
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await dbConnect();
    const t = await getTenant('marketing');
    t.requireWrite();
    const id = recordId(new URL(req.url).searchParams.get('id'));
    const reg = await MktEventRegistration.findOneAndDelete(t.where({ _id: id }));
    if (!reg) throw new NotFoundError('Registration not found');
    await MktEvent.updateOne(t.where({ _id: reg.eventId }), { $inc: { registrationCount: -1 } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return apiError(error, 'Error deleting event registration:');
  }
}
