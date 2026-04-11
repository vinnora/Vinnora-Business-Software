import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import Contact from '@/models/Contact';

export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    const session = await getServerSession(authOptions);
    const userId = session?.user?.email || 'dev-user-id';

    const { searchParams } = new URL(req.url);
    const accountId = searchParams.get('accountId');
    const search = searchParams.get('search');

    const filter: any = { userId };
    if (accountId) filter.accountId = accountId;
    if (search) {
      filter.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const contacts = await Contact.find(filter).sort({ updatedAt: -1 }).limit(200);
    return NextResponse.json(contacts);
  } catch (error) {
    console.error('Error fetching contacts:', error);
    return NextResponse.json([], { status: 200 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const session = await getServerSession(authOptions);
    const userId = session?.user?.email || 'dev-user-id';

    const body = await req.json();
    if (!body.firstName || !body.lastName) {
      return NextResponse.json(
        { error: 'firstName and lastName are required' },
        { status: 400 }
      );
    }

    const contact = await Contact.create({ ...body, userId });
    return NextResponse.json(contact, { status: 201 });
  } catch (error) {
    console.error('Error creating contact:', error);
    return NextResponse.json({ error: 'Failed to create contact' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await dbConnect();
    const body = await req.json();
    const { _id, ...updates } = body;
    if (!_id) return NextResponse.json({ error: '_id required' }, { status: 400 });
    const contact = await Contact.findByIdAndUpdate(_id, updates, { new: true });
    return NextResponse.json(contact);
  } catch (error) {
    console.error('Error updating contact:', error);
    return NextResponse.json({ error: 'Failed to update contact' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
    await Contact.findByIdAndDelete(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting contact:', error);
    return NextResponse.json({ error: 'Failed to delete contact' }, { status: 500 });
  }
}
