import { NextRequest, NextResponse } from 'next/server';
import { getTenant, apiError } from '@/lib/tenant';
import dbConnect from '@/lib/mongodb';
import Item from '@/models/Item';
import Warehouse from '@/models/Warehouse';
import Supplier from '@/models/Supplier';
import PurchaseOrder from '@/models/PurchaseOrder';
import StockTransfer from '@/models/StockTransfer';
import StockAudit from '@/models/StockAudit';

export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    const t = await getTenant('inventory');
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type') || 'dashboard-summary';

    let report: any = {};
    switch (type) {
      case 'dashboard-summary': {
        const [
          totalItems,
          totalWarehouses,
          totalSuppliers,
          openPOs,
          inTransitTransfers,
          lowStockItems,
          outOfStockItems,
          expiringItems,
        ] = await Promise.all([
          Item.countDocuments(t.where()),
          Warehouse.countDocuments(t.where({ active: true })),
          Supplier.countDocuments(t.where({ active: true })),
          PurchaseOrder.countDocuments(
            t.where({ status: { $in: ['draft', 'sent', 'acknowledged'] } })
          ),
          StockTransfer.countDocuments(t.where({ status: 'in-transit' })),
          Item.countDocuments(
            t.where({
              $expr: { $and: [{ $gt: ['$totalStock', 0] }, { $lte: ['$totalStock', '$reorderPoint'] }] },
            })
          ),
          Item.countDocuments(t.where({ totalStock: 0 })),
          Item.countDocuments(
            t.where({
              expiryDate: {
                $gte: new Date(),
                $lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
              },
            })
          ),
        ]);

        const stockValue = await Item.aggregate([
          { $match: t.where() },
          {
            $group: {
              _id: null,
              totalCostValue: { $sum: { $multiply: ['$totalStock', '$costPrice'] } },
              totalRetailValue: { $sum: { $multiply: ['$totalStock', '$sellingPrice'] } },
            },
          },
        ]);

        report = {
          type: 'dashboard-summary',
          totalItems,
          totalWarehouses,
          totalSuppliers,
          openPOs,
          inTransitTransfers,
          lowStockItems,
          outOfStockItems,
          expiringItems,
          totalCostValue: stockValue[0]?.totalCostValue || 0,
          totalRetailValue: stockValue[0]?.totalRetailValue || 0,
        };
        break;
      }
      case 'stock-by-warehouse': {
        const data = await Item.aggregate([
          { $match: t.where() },
          { $unwind: '$warehouseStocks' },
          {
            $group: {
              _id: '$warehouseStocks.warehouseName',
              totalQty: { $sum: '$warehouseStocks.quantity' },
              totalValue: {
                $sum: { $multiply: ['$warehouseStocks.quantity', '$costPrice'] },
              },
              skuCount: { $sum: 1 },
            },
          },
          { $sort: { totalValue: -1 } },
        ]);
        report = { type: 'stock-by-warehouse', warehouses: data };
        break;
      }
      case 'stock-by-category': {
        const data = await Item.aggregate([
          { $match: t.where() },
          {
            $group: {
              _id: '$category',
              totalItems: { $sum: 1 },
              totalQty: { $sum: '$totalStock' },
              totalValue: { $sum: { $multiply: ['$totalStock', '$costPrice'] } },
            },
          },
          { $sort: { totalValue: -1 } },
        ]);
        report = { type: 'stock-by-category', categories: data };
        break;
      }
      case 'low-stock': {
        const items = await Item.find(
          t.where({ $expr: { $lte: ['$totalStock', '$reorderPoint'] } })
        )
          .limit(100)
          .lean();
        report = { type: 'low-stock', items };
        break;
      }
      case 'expiring-soon': {
        const items = await Item.find(
          t.where({
            expiryDate: {
              $gte: new Date(),
              $lte: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
            },
          })
        )
          .sort({ expiryDate: 1 })
          .limit(100)
          .lean();
        report = { type: 'expiring-soon', items };
        break;
      }
      case 'aging': {
        // Stock aging buckets based on createdAt
        const now = Date.now();
        const items = await Item.find(t.where({ totalStock: { $gt: 0 } })).limit(500).lean();
        const buckets = { fresh: 0, mature: 0, slow: 0, dead: 0 };
        items.forEach((it: any) => {
          const ageDays = (now - new Date(it.createdAt).getTime()) / (1000 * 60 * 60 * 24);
          const value = (it.totalStock || 0) * (it.costPrice || 0);
          if (ageDays < 30) buckets.fresh += value;
          else if (ageDays < 90) buckets.mature += value;
          else if (ageDays < 180) buckets.slow += value;
          else buckets.dead += value;
        });
        report = { type: 'aging', buckets };
        break;
      }
      case 'po-summary': {
        const data = await PurchaseOrder.aggregate([
          { $match: t.where() },
          {
            $group: {
              _id: '$status',
              count: { $sum: 1 },
              total: { $sum: '$total' },
            },
          },
        ]);
        report = { type: 'po-summary', byStatus: data };
        break;
      }
      case 'supplier-performance': {
        const data = await PurchaseOrder.aggregate([
          { $match: t.where() },
          {
            $group: {
              _id: '$supplierName',
              orderCount: { $sum: 1 },
              totalSpend: { $sum: '$total' },
            },
          },
          { $sort: { totalSpend: -1 } },
          { $limit: 20 },
        ]);
        report = { type: 'supplier-performance', suppliers: data };
        break;
      }
      default:
        report = { type: 'unknown' };
    }
    return NextResponse.json(report);
  } catch (error) {
    return apiError(error, 'Inventory report error:');
  }
}
