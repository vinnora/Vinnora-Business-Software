import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import MktSurveyResponse from '@/models/MktSurveyResponse';
import MktSurvey from '@/models/MktSurvey';
import { getTenant, sanitize, recordId, apiError, NotFoundError } from '@/lib/tenant';

export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    const t = await getTenant('marketing');
    const { searchParams } = new URL(req.url);
    const surveyId = searchParams.get('surveyId');

    const filter: Record<string, unknown> = {};
    if (surveyId) filter.surveyId = surveyId;
    const items = await MktSurveyResponse.find(t.where(filter)).sort({ createdAt: -1 }).limit(500);
    return NextResponse.json(items);
  } catch (error) {
    return apiError(error, 'Error fetching survey responses:');
  }
}

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const t = await getTenant('marketing');
    t.requireWrite();
    const body = await req.json();
    if (!body.surveyId || !body.answers) {
      return NextResponse.json({ error: 'surveyId and answers required' }, { status: 400 });
    }
    const surveyId = recordId(body.surveyId);
    const survey = await MktSurvey.findOne(t.where({ _id: surveyId })).select('_id');
    if (!survey) throw new NotFoundError('Survey not found');

    const item = await MktSurveyResponse.create({ ...sanitize(body), ...t.stamp(), completedAt: new Date() });
    await MktSurvey.updateOne(t.where({ _id: surveyId }), { $inc: { responseCount: 1 } });
    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    return apiError(error, 'Error creating survey response:');
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await dbConnect();
    const t = await getTenant('marketing');
    t.requireWrite();
    const id = recordId(new URL(req.url).searchParams.get('id'));
    const resp = await MktSurveyResponse.findOneAndDelete(t.where({ _id: id }));
    if (!resp) throw new NotFoundError('Survey response not found');
    await MktSurvey.updateOne(t.where({ _id: resp.surveyId }), { $inc: { responseCount: -1 } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return apiError(error, 'Error deleting survey response:');
  }
}
