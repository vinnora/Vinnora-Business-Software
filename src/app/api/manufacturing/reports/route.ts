import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import MfgWorkOrder from '@/models/MfgWorkOrder';
import MfgMaterial from '@/models/MfgMaterial';
import MfgMachine from '@/models/MfgMachine';
import MfgQualityCheck from '@/models/MfgQualityCheck';
import MfgSupplier from '@/models/MfgSupplier';
import MfgPurchaseRequisition from '@/models/MfgPurchaseRequisition';
import { getTenant, apiError } from '@/lib/tenant';

export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    const t = await getTenant('manufacturing');
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type');

    switch (type) {
      case 'dashboard-summary': {
        const [
          totalWorkOrders,
          activeWorkOrders,
          totalMaterials,
          lowStockMaterials,
          totalMachines,
          operationalMachines,
          pendingQualityChecks,
          totalSuppliers,
          openRequisitions,
        ] = await Promise.all([
          MfgWorkOrder.countDocuments(t.where()),
          MfgWorkOrder.countDocuments(t.where({ status: 'In Progress' })),
          MfgMaterial.countDocuments(t.where()),
          MfgMaterial.countDocuments(t.where({ $expr: { $lte: ['$currentStock', '$reorderPoint'] } })),
          MfgMachine.countDocuments(t.where()),
          MfgMachine.countDocuments(t.where({ status: 'Operational' })),
          MfgQualityCheck.countDocuments(t.where({ status: 'Pending' })),
          MfgSupplier.countDocuments(t.where()),
          MfgPurchaseRequisition.countDocuments(t.where({ status: 'Open' })),
        ]);
        return NextResponse.json({
          totalWorkOrders,
          activeWorkOrders,
          totalMaterials,
          lowStockMaterials,
          totalMachines,
          operationalMachines,
          pendingQualityChecks,
          totalSuppliers,
          openRequisitions,
        });
      }
      default:
        return NextResponse.json({ error: 'Unknown report type' }, { status: 400 });
    }
  } catch (error) {
    return apiError(error, 'Error building manufacturing report:');
  }
}
