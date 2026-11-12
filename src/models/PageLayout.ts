import mongoose, { Schema, Document } from 'mongoose';

export interface IPageLayout extends Document {
  orgId: string;
  objectApiName: string;
  name: string;
  description?: string;
  isDefault: boolean;
  sections: {
    id: string;
    label: string;
    columns: 1 | 2;
    hideOnCreate?: boolean;
    items: { field: string; behavior: 'edit' | 'required' | 'readonly' }[];
  }[];
  createdAt: Date;
  updatedAt: Date;
}

const PageLayoutSchema = new Schema<IPageLayout>(
  {
    orgId: { type: String, required: true, index: true },
    objectApiName: { type: String, required: true, index: true },
    name: { type: String, required: true },
    description: { type: String },
    isDefault: { type: Boolean, default: false },
    sections: [
      {
        _id: false,
        id: { type: String, required: true },
        label: { type: String, required: true },
        columns: { type: Number, enum: [1, 2], default: 2 },
        hideOnCreate: { type: Boolean, default: false },
        items: [
          {
            _id: false,
            field: { type: String, required: true },
            behavior: { type: String, enum: ['edit', 'required', 'readonly'], default: 'edit' },
          },
        ],
      },
    ],
  },
  { timestamps: true }
);

export default mongoose.models.PageLayout ||
  mongoose.model<IPageLayout>('PageLayout', PageLayoutSchema);
