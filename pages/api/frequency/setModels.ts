import type { NextApiRequest as Req2, NextApiResponse as Res2 } from 'next';
import { connectToDatabase } from "../db/mongo";
import { requireCollection } from '@/lib/requireCollection';
import { FrequencyCurrent, FrequencyIdeal, FrequencyDoc } from '@/utils/interfaces/frequency';

export default async function handlerSetModels(req: Req2, res: Res2) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
  }

  try {
    const { userId, current, ideal } = req.body ?? {} as {
      userId?: string;
      current?: FrequencyCurrent;
      ideal?: FrequencyIdeal;
    };

    if (!userId) return res.status(400).json({ ok: false, error: 'Missing userId' });

    const { db } = await connectToDatabase();
    const col = await requireCollection<FrequencyDoc>(db, 'frequency');

    const now = new Date();

    const result = await col.updateOne(
      { userId, type: 'frequency' },
      {
        $setOnInsert: { type: 'frequency', userId, createdAt: now, version: 1 },
        $set: { 'models.current': current ?? null, 'models.ideal': ideal ?? null, updatedAt: now },
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
    console.error('[setModels] error', err);
    return res.status(500).json({ ok: false, error: err?.message || 'Unknown error' });
  }
}
