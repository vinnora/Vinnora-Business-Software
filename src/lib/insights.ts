/**
 * Lightweight on-device "AI" helpers — no external LLM calls.
 * For Salesforce-style sentiment/summary previews until a real model is wired.
 */

const POSITIVE_WORDS = [
  'thanks', 'thank you', 'great', 'awesome', 'excellent', 'love', 'happy',
  'perfect', 'wonderful', 'amazing', 'helpful', 'resolved', 'fixed', 'good',
  'satisfied', 'fast', 'quick', 'best', 'pleased',
];

const NEGATIVE_WORDS = [
  'bad', 'terrible', 'awful', 'broken', 'angry', 'frustrated', 'unhappy',
  'disappointed', 'hate', 'worst', 'slow', 'useless', 'crash', 'error',
  'fail', 'failed', 'unacceptable', 'horrible', 'wrong', 'issue', 'problem',
  'urgent', 'critical', 'never', 'refund', 'cancel',
];

export function analyzeSentiment(text: string): {
  score: number;
  sentiment: 'positive' | 'neutral' | 'negative';
  positiveHits: number;
  negativeHits: number;
} {
  if (!text) return { score: 0, sentiment: 'neutral', positiveHits: 0, negativeHits: 0 };
  const lower = text.toLowerCase();
  const positiveHits = POSITIVE_WORDS.filter((w) => lower.includes(w)).length;
  const negativeHits = NEGATIVE_WORDS.filter((w) => lower.includes(w)).length;
  const score = positiveHits - negativeHits;
  const sentiment = score > 0 ? 'positive' : score < 0 ? 'negative' : 'neutral';
  return { score, sentiment, positiveHits, negativeHits };
}

export function summarize(text: string, maxSentences = 3): string {
  if (!text) return '';
  const sentences = text
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?])\s+/)
    .filter((s) => s.length > 10);
  if (sentences.length <= maxSentences) return sentences.join(' ');

  // Score by length + keyword density
  const wordFreq: Record<string, number> = {};
  const allWords = text.toLowerCase().match(/\b\w{4,}\b/g) || [];
  allWords.forEach((w) => (wordFreq[w] = (wordFreq[w] || 0) + 1));

  const scored = sentences.map((s, i) => {
    const words = (s.toLowerCase().match(/\b\w{4,}\b/g) || []);
    const score = words.reduce((sum, w) => sum + (wordFreq[w] || 0), 0) / Math.max(1, words.length);
    return { s, i, score };
  });

  scored.sort((a, b) => b.score - a.score);
  const top = scored.slice(0, maxSentences).sort((a, b) => a.i - b.i);
  return top.map((t) => t.s).join(' ');
}

export function extractKeyPhrases(text: string, limit = 5): string[] {
  if (!text) return [];
  const stop = new Set([
    'the', 'and', 'for', 'with', 'this', 'that', 'from', 'have', 'has',
    'will', 'was', 'were', 'are', 'you', 'your', 'our', 'but', 'not',
    'they', 'them', 'their', 'when', 'what', 'which', 'about', 'into',
  ]);
  const words = (text.toLowerCase().match(/\b[a-z]{4,}\b/g) || []).filter((w) => !stop.has(w));
  const freq: Record<string, number> = {};
  words.forEach((w) => (freq[w] = (freq[w] || 0) + 1));
  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([w]) => w);
}
