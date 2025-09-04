import type { NextApiRequest, NextApiResponse } from 'next';
import { connectToDatabase } from '../db/connectToDatabase';
import { requireCollection } from '@/lib/requireCollection';

function toYMD(d = new Date()) {
  return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,10)
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') { res.setHeader('Allow','GET'); return res.status(405).json({ ok:false, error:'Method Not Allowed' }); }
  try {
    const userId = String(req.query.userId||'');
    if (!userId) return res.status(400).json({ ok:false, error:'Missing userId' });
    const date = (typeof req.query.date==='string' && /\d{4}-\d{2}-\d{2}/.test(req.query.date)) ? String(req.query.date) : toYMD();

    const { db } = await connectToDatabase();
    const appData = await requireCollection<any>(db, 'appData');

    const docs = await appData.find({ userId, type:'frequency_baseMood_log', date }).toArray();

    const get = (tod: 'morning'|'noon'|'evening') => (docs.find(d => d.timeOfDay===tod)?.moods ?? []);
    const getScore = (tod: 'morning'|'noon'|'evening') => (docs.find(d => d.timeOfDay===tod)?.score ?? null);

    return res.status(200).json({
      ok: true,
      userId, date,
      morning: get('morning'),
      noon: get('noon'),
      evening: get('evening'),
      scores: { morning: getScore('morning'), noon: getScore('noon'), evening: getScore('evening') }
    });
  } catch (err:any) {
    console.error('[moodLogs] error', err);
    return res.status(500).json({ ok:false, error: err?.message || 'Unknown error' });
  }
}
