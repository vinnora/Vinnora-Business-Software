import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Asset from '@/models/Asset';
import { runAccountingWorkflows } from '@/lib/accounting-workflows';
import { getTenant, sanitize, recordId, apiError, NotFoundError } from '@/lib/tenant';

function generateAssetNumber() {
  return 'AST-' + Date.now().toString().slice(-6);
}

export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    const t = await getTenant('accounting');

    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category');
    const status = searchParams.get('status');

    const filter: Record<string, unknown> = {};
    if (category) filter.category = category;
    if (status) filter.status = status;

    const assets = await Asset.find(t.where(filter)).sort({ purchaseDate: -1 }).limit(50);
    return NextResponse.json(assets);
  } catch (error) {
    return apiError(error, 'Error fetching assets:');
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await dbConnect();
    const t = await getTenant('accounting');
    t.requireWrite();

    const body = await req.json();
    if (!body._id) return NextResponse.json({ error: '_id required' }, { status: 400 });
    const updates = sanitize(body);
    const asset = await Asset.findOneAndUpdate(t.where({ _id: recordId(body._id) }), updates, {
      new: true,
      runValidators: true,
    });
    if (!asset) throw new NotFoundError('Asset not found');
    await runAccountingWorkflows({
      objectType: 'Asset',
      event: 'fieldChanged',
      record: asset,
      userId: asset.userId,
      scope: t.where(),
      changedFields: Object.keys(updates),
    });
    return NextResponse.json(asset);
  } catch (error) {
    return apiError(error, 'Error updating asset:');
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await dbConnect();
    const t = await getTenant('accounting');
    t.requireWrite();

    const raw = new URL(req.url).searchParams.get('id');
    if (!raw) return NextResponse.json({ error: 'id required' }, { status: 400 });
    const res = await Asset.deleteOne(t.where({ _id: recordId(raw) }));
    if (!res.deletedCount) throw new NotFoundError('Asset not found');
    return NextResponse.json({ success: true });
  } catch (error) {
    return apiError(error, 'Error deleting asset:');
  }
}

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const t = await getTenant('accounting');
    t.requireWrite();

    const body = await req.json();
    const {
      assetName,
      category,
      originalCost,
      purchaseDate,
      usefulLife,
      salvageValue,
      depreciationMethod,
      location,
      assignedTo,
      description,
      notes,
    } = body;

    if (!assetName || !category || !originalCost || !purchaseDate || !usefulLife) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Calculate depreciation and book value
    const monthsOwned =
      (new Date().getTime() - new Date(purchaseDate).getTime()) / (1000 * 60 * 60 * 24 * 30);
    const totalDepreciable = originalCost - salvageValue;
    const monthlyDepreciation = totalDepreciable / (usefulLife * 12);
    const totalDepreciation = monthlyDepreciation * monthsOwned;
    const bookValue = originalCost - totalDepreciation;

    const asset = new Asset({
      ...t.stamp(),
      assetName,
      assetNumber: generateAssetNumber(),
      category,
      description,
      originalCost,
      purchaseDate,
      usefulLife,
      depreciation: totalDepreciation,
      bookValue: Math.max(0, bookValue),
      salvageValue: salvageValue || 0,
      depreciationMethod: depreciationMethod || 'straight-line',
      location,
      assignedTo,
      condition: 'good',
      status: 'active',
      notes,
    });

    await asset.save();
    await runAccountingWorkflows({ objectType: 'Asset', event: 'created', record: asset, userId: asset.userId, scope: t.where() });

    return NextResponse.json(asset, { status: 201 });
  } catch (error) {
    return apiError(error, 'Error creating asset:');
  }
}
