import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import TaxConfiguration from '@/models/TaxConfiguration';
import { getTenant, sanitize, recordId, apiError, NotFoundError } from '@/lib/tenant';

export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    const t = await getTenant('accounting');

    const { searchParams } = new URL(req.url);
    const taxType = searchParams.get('taxType');
    const jurisdiction = searchParams.get('jurisdiction');

    const filter: Record<string, unknown> = {};
    if (taxType) filter.taxType = taxType;
    if (jurisdiction) filter.jurisdiction = jurisdiction;

    const configs = await TaxConfiguration.find(t.where(filter)).sort({ applicableFrom: -1 });
    return NextResponse.json(configs);
  } catch (error) {
    return apiError(error, 'Error fetching tax config:');
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await dbConnect();
    const t = await getTenant('accounting');
    t.requireWrite();

    const body = await req.json();
    if (!body._id) return NextResponse.json({ error: '_id required' }, { status: 400 });
    const config = await TaxConfiguration.findOneAndUpdate(t.where({ _id: recordId(body._id) }), sanitize(body), {
      new: true,
      runValidators: true,
    });
    if (!config) throw new NotFoundError('Tax configuration not found');
    return NextResponse.json(config);
  } catch (error) {
    return apiError(error, 'Error updating tax config:');
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await dbConnect();
    const t = await getTenant('accounting');
    t.requireWrite();

    const raw = new URL(req.url).searchParams.get('id');
    if (!raw) return NextResponse.json({ error: 'id required' }, { status: 400 });
    const res = await TaxConfiguration.deleteOne(t.where({ _id: recordId(raw) }));
    if (!res.deletedCount) throw new NotFoundError('Tax configuration not found');
    return NextResponse.json({ success: true });
  } catch (error) {
    return apiError(error, 'Error deleting tax config:');
  }
}

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const t = await getTenant('accounting');
    t.requireWrite();

    const body = await req.json();
    const { taxType, taxRate, jurisdiction, applicableFrom, applicableTo, description, taxCode, notes } =
      body;

    if (!taxType || taxRate === undefined || !jurisdiction || !applicableFrom) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const config = new TaxConfiguration({
      ...t.stamp(),
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
    return apiError(error, 'Error creating tax config:');
  }
}
