import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import KnowledgeArticle from '@/models/KnowledgeArticle';
import { getTenant, sanitize, recordId, apiError, NotFoundError } from '@/lib/tenant';

function slugify(s: string) {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    const t = await getTenant('sales-service');

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const category = searchParams.get('category');
    const search = searchParams.get('search');

    const filter: Record<string, unknown> = {};
    if (status) filter.status = status;
    if (category) filter.category = category;
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { summary: { $regex: search, $options: 'i' } },
        { body: { $regex: search, $options: 'i' } },
      ];
    }

    const articles = await KnowledgeArticle.find(t.where(filter)).sort({ updatedAt: -1 }).limit(200);
    return NextResponse.json(articles);
  } catch (error) {
    return apiError(error, 'Error fetching articles:');
  }
}

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const t = await getTenant('sales-service');
    t.requireWrite();

    const body = await req.json();
    if (!body.title || !body.body) {
      return NextResponse.json(
        { error: 'title and body are required' },
        { status: 400 }
      );
    }

    const article = await KnowledgeArticle.create({
      ...sanitize(body),
      ...t.stamp(),
      slug: body.slug || slugify(body.title),
      publishedAt: body.status === 'Published' ? new Date() : undefined,
    });
    return NextResponse.json(article, { status: 201 });
  } catch (error) {
    return apiError(error, 'Error creating article:');
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await dbConnect();
    const t = await getTenant('sales-service');
    t.requireWrite();

    const body = await req.json();
    const id = recordId(body._id);
    const updates: Record<string, unknown> = sanitize(body);

    if (updates.status === 'Published' && !updates.publishedAt) {
      updates.publishedAt = new Date();
    }

    const article = await KnowledgeArticle.findOneAndUpdate(t.where({ _id: id }), updates, { new: true, runValidators: true });
    if (!article) throw new NotFoundError('Help article not found');
    return NextResponse.json(article);
  } catch (error) {
    return apiError(error, 'Error updating article:');
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await dbConnect();
    const t = await getTenant('sales-service');
    t.requireWrite();
    const id = recordId(new URL(req.url).searchParams.get('id'));
    const res = await KnowledgeArticle.deleteOne(t.where({ _id: id }));
    if (!res.deletedCount) throw new NotFoundError('Help article not found');
    return NextResponse.json({ success: true });
  } catch (error) {
    return apiError(error, 'Error deleting article:');
  }
}
