import mongoose, { Schema, Document } from 'mongoose';

export interface IKnowledgeArticle extends Document {
  userId: string;
  orgId?: string;
  title: string;
  slug: string;
  summary?: string;
  body: string;
  category?: string;
  tags?: string[];
  status: 'Draft' | 'Published' | 'Archived';
  visibility: 'Internal' | 'Public';
  authorId?: string;
  authorName?: string;
  views: number;
  helpfulCount: number;
  notHelpfulCount: number;
  publishedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const KnowledgeArticleSchema = new Schema<IKnowledgeArticle>(
  {
    userId: { type: String, required: true, index: true },
    orgId: { type: String, index: true },
    title: { type: String, required: true },
    slug: { type: String, required: true, index: true },
    summary: { type: String },
    body: { type: String, required: true },
    category: { type: String, index: true },
    tags: [{ type: String }],
    status: {
      type: String,
      enum: ['Draft', 'Published', 'Archived'],
      default: 'Draft',
    },
    visibility: {
      type: String,
      enum: ['Internal', 'Public'],
      default: 'Internal',
    },
    authorId: { type: String },
    authorName: { type: String },
    views: { type: Number, default: 0 },
    helpfulCount: { type: Number, default: 0 },
    notHelpfulCount: { type: Number, default: 0 },
    publishedAt: { type: Date },
  },
  { timestamps: true }
);

export default mongoose.models.KnowledgeArticle ||
  mongoose.model<IKnowledgeArticle>('KnowledgeArticle', KnowledgeArticleSchema);
