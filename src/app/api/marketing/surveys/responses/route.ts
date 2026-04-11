import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import MktSurveyResponse from '@/models/MktSurveyResponse';
import MktSurvey from '@/models/MktSurvey';

export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    const session = await getServerSession(authOptions);
    const userId = session?.user?.email || 'dev-user-id';
    const { searchParams } = new URL(req.url);
    const surveyId = searchParams.get('surveyId');

    const filter: any = { userId };
    if (surveyId) filter.surveyId = surveyId;
    const items = await MktSurveyResponse.find(filter).sort({ createdAt: -1 }).limit(500);
    return NextResponse.json(items);
  } catch (error) {
    return NextResponse.json([], { status: 200 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const session = await getServerSession(authOptions);
    const userId = session?.user?.email || 'dev-user-id';
    const body = await req.json();
    if (!body.surveyId || !body.answers) {
      return NextResponse.json({ error: 'surveyId and answers required' }, { status: 400 });
    }
    const item = await MktSurveyResponse.create({ ...body, userId, completedAt: new Date() });
    await MktSurvey.findByIdAndUpdate(body.surveyId, { $inc: { responseCount: 1 } });
    return NextResponse.json(item, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
    const resp = await MktSurveyResponse.findByIdAndDelete(id);
    if (resp) {
      await MktSurvey.findByIdAndUpdate(resp.surveyId, { $inc: { responseCount: -1 } });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
  }
}
