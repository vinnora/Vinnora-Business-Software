import { NextRequest, NextResponse } from 'next/server';
import { analyzeSentiment, summarize, extractKeyPhrases } from '@/lib/insights';

/**
 * AI insights endpoint. Currently uses local heuristics so it works offline;
 * swap with a real LLM call by replacing the implementations.
 *
 * POST { action: 'sentiment'|'summarize'|'keyPhrases', text }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, text } = body;
    if (!action || !text) {
      return NextResponse.json({ error: 'action and text required' }, { status: 400 });
    }
    switch (action) {
      case 'sentiment':
        return NextResponse.json(analyzeSentiment(text));
      case 'summarize':
        return NextResponse.json({ summary: summarize(text, body.maxSentences || 3) });
      case 'keyPhrases':
        return NextResponse.json({ phrases: extractKeyPhrases(text, body.limit || 5) });
      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch (error) {
    return NextResponse.json({ error: 'AI request failed' }, { status: 500 });
  }
}
