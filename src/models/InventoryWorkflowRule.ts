import mongoose, { Schema, Document } from 'mongoose';

export type InventoryWorkflowObject =
  | 'Item'
  | 'PurchaseOrder'
  | 'StockTransfer'
  | 'StockAudit'
  | 'WarehouseStock';

export type InventoryWorkflowEvent =
  | 'created'
  | 'updated'
  | 'fieldChanged'
  | 'lowStock'
  | 'outOfStock'
  | 'expiringSoon'
  | 'received'
  | 'shipped';

export type InventoryActionType =
  | 'createPurchaseOrder'
  | 'createStockTransfer'
  | 'createStockAudit'
  | 'updateField'
  | 'sendAlert'
  | 'sendEmail'
  | 'webhook'
  | 'logEvent';

export interface IInventoryWorkflowCondition {
  field: string;
  operator:
    | 'equals'
    | 'notEquals'
    | 'contains'
    | 'greaterThan'
    | 'lessThan'
    | 'isEmpty'
    | 'isNotEmpty';
  value?: any;
}

export interface IInventoryWorkflowAction {
  type: InventoryActionType;
  params: Record<string, any>;
}

export interface IInventoryWorkflowRule extends Document {
  userId: string;
  orgId?: string;
  name: string;
  description?: string;
  active: boolean;
  isDefault?: boolean;
  objectType: InventoryWorkflowObject;
  triggerEvent: InventoryWorkflowEvent;
  watchFields?: string[];
  conditions: IInventoryWorkflowCondition[];
  conditionLogic: 'AND' | 'OR';
  actions: IInventoryWorkflowAction[];
  runCount: number;
  lastRunAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const InventoryWorkflowRuleSchema = new Schema<IInventoryWorkflowRule>(
  {
    userId: { type: String, required: true, index: true },
    orgId: { type: String, index: true },
    name: { type: String, required: true },
    description: { type: String },
    active: { type: Boolean, default: true },
    isDefault: { type: Boolean, default: false },
    objectType: {
      type: String,
      enum: ['Item', 'PurchaseOrder', 'StockTransfer', 'StockAudit', 'WarehouseStock'],
      required: true,
    },
    triggerEvent: {
      type: String,
      enum: [
        'created',
        'updated',
        'fieldChanged',
        'lowStock',
        'outOfStock',
        'expiringSoon',
        'received',
        'shipped',
      ],
      required: true,
    },
    watchFields: [{ type: String }],
    conditions: [
      {
        field: { type: String, required: true },
        operator: {
          type: String,
          enum: ['equals', 'notEquals', 'contains', 'greaterThan', 'lessThan', 'isEmpty', 'isNotEmpty'],
          required: true,
        },
        value: { type: Schema.Types.Mixed },
      },
    ],
    conditionLogic: { type: String, enum: ['AND', 'OR'], default: 'AND' },
    actions: [
      {
        type: {
          type: String,
          enum: [
            'createPurchaseOrder',
            'createStockTransfer',
            'createStockAudit',
            'updateField',
            'sendAlert',
            'sendEmail',
            'webhook',
            'logEvent',
          ],
          required: true,
        },
        params: { type: Schema.Types.Mixed, default: {} },
      },
    ],
    runCount: { type: Number, default: 0 },
    lastRunAt: { type: Date },
  },
  { timestamps: true }
);

export default mongoose.models.InventoryWorkflowRule ||
  mongoose.model<IInventoryWorkflowRule>('InventoryWorkflowRule', InventoryWorkflowRuleSchema);
