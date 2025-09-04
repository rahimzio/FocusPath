// pages/api/frequency/series.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { connectToDatabase } from '../db/connectToDatabase';
import { requireCollection } from '@/lib/requireCollection';

function toYMD(d = new Date()) {
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}
function addDaysYMD(ymd: string, delta: number) {
  const d = new Date(ymd + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + delta);
  return toYMD(d);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
  }
  try {
    const userId = String(req.query.userId || '');
    if (!userId) return res.status(400).json({ ok: false, error: 'Missing userId' });

    const end =
      typeof req.query.end === 'string' && /\d{4}-\d{2}-\d{2}/.test(req.query.end)
        ? String(req.query.end)
        : toYMD();
    const days = Math.max(1, Math.min(180, Number(req.query.days) || 28)); // cap: 180
    const start = addDaysYMD(end, -(days - 1));

    const { db } = await connectToDatabase();
    const appData = await requireCollection<any>(db, 'appData');

    const docs = await appData
      .find({
        userId,
        type: 'frequency_daily_summary',
        date: { $gte: start, $lte: end },
      })
      .project({ _id: 0, date: 1, taskScore: 1, convTarget: 1, moodAvg: 1 })
      .sort({ date: 1 })
      .toArray();

    return res.status(200).json({
      ok: true,
      userId,
      from: start,
      to: end,
      days,
      series: docs, // [{date, taskScore, convTarget, moodAvg}]
    });
  } catch (err: any) {
    console.error('[series] error', err);
    return res.status(500).json({ ok: false, error: err?.message || 'Unknown error' });
  }
}
