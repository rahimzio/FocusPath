import type { NextApiRequest, NextApiResponse } from 'next';
import { requireCollection } from '@/lib/requireCollection';
import { connectToDatabase } from '../db/connectToDatabase';
import { FrequencyDoc, FrequencyBase } from '@/utils/interfaces/frequency';
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
  }

  try {
    const {
      userId,
      baseFrequency,
      baseConviction,
      selfView = [],
      emotion = [],
      focusLeaks = [],
      defaultReactions = [],
      expectations = [],
    } = req.body ?? {};

    if (!userId) return res.status(400).json({ ok: false, error: 'Missing userId' });

    const { db } = await connectToDatabase();
    const col = await requireCollection<FrequencyDoc>(db, 'frequency');

    const now = new Date();
    const base: FrequencyBase = {
      baseFrequency: clamp0to10(baseFrequency),
      baseConviction: clamp0to10(baseConviction),
      selfView: arr(selfView),
      emotion: arr(emotion),
      focusLeaks: arr(focusLeaks),
      defaultReactions: arr(defaultReactions),
      expectations: arr(expectations),
      updatedAt: now,
    };

    const result = await col.updateOne(
      { userId, type: 'frequency' },
      {
        $setOnInsert: { type: 'frequency', userId, createdAt: now, version: 1 },
        $set: { base, updatedAt: now },
      },
      { upsert: true }
    );

    return res.status(200).json({
      ok: true,
      upserted: result.upsertedCount ?? 0,
      matched: result.matchedCount ?? 0,
      modified: result.modifiedCount ?? 0,
    });
  } catch (err: any) {
    console.error('[setBase] error', err);
    return res.status(500).json({ ok: false, error: err?.message || 'Unknown error' });
  }
}

function clamp0to10(v: any) {
  const n = Math.round(Number(v));
  return Math.min(10, Math.max(0, Number.isFinite(n) ? n : 0));
}
function arr(a: any): string[] { return Array.isArray(a) ? a.map(String).filter(Boolean) : []; }
