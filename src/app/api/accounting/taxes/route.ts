import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import TaxConfiguration from '@/models/TaxConfiguration';

export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    const session = await getServerSession(authOptions);
    const userId = session?.user?.email || 'dev-user-id';

    const { searchParams } = new URL(req.url);
    const taxType = searchParams.get('taxType');
    const jurisdiction = searchParams.get('jurisdiction');

    const filter: any = { userId };
    if (taxType) filter.taxType = taxType;
    if (jurisdiction) filter.jurisdiction = jurisdiction;

    const configs = await TaxConfiguration.find(filter).sort({ applicableFrom: -1 });
    return NextResponse.json(configs);
  } catch (error) {
    console.error('Error fetching tax config:', error);
    return NextResponse.json([], { status: 200 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await dbConnect();
    const body = await req.json();
    const { _id, ...updates } = body;
    if (!_id) return NextResponse.json({ error: '_id required' }, { status: 400 });
    const config = await TaxConfiguration.findByIdAndUpdate(_id, updates, { new: true });
    return NextResponse.json(config);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
    await TaxConfiguration.findByIdAndDelete(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const session = await getServerSession(authOptions);
    const userId = session?.user?.email || 'dev-user-id';

    const body = await req.json();
    const { taxType, taxRate, jurisdiction, applicableFrom, applicableTo, description, taxCode, notes } =
      body;

    if (!taxType || taxRate === undefined || !jurisdiction || !applicableFrom) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const config = new TaxConfiguration({
      userId,
      taxType,
      taxRate,
      jurisdiction,
      applicableFrom,
      applicableTo,
      description,
      taxCode,
      status: 'active',
      notes,
    });

    await config.save();
    return NextResponse.json(config, { status: 201 });
  } catch (error) {
    console.error('Error creating tax config:', error);
    return NextResponse.json({ error: 'Failed to create tax config' }, { status: 500 });
  }
}
