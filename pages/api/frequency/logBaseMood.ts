import type { NextApiRequest, NextApiResponse } from 'next';
import { connectToDatabase } from '../db/connectToDatabase';
import { requireCollection } from '@/lib/requireCollection';

type TimeOfDay = 'morning' | 'noon' | 'evening';

function toYMD(d = new Date()) {
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') { res.setHeader('Allow','POST'); return res.status(405).json({ ok:false, error:'Method Not Allowed' }); }
  try {
    const { userId, date: dateProp, timeOfDay, moods } = req.body ?? {};
    if (!userId || !['morning', 'noon', 'evening'].includes(timeOfDay)) {
      return res.status(400).json({ ok:false, error:'Missing userId or invalid timeOfDay' });
    }
    const date = (typeof dateProp === 'string' && /\d{4}-\d{2}-\d{2}/.test(dateProp)) ? dateProp : toYMD();

    const { db } = await connectToDatabase();
    const appData = await requireCollection<any>(db, 'appData');
    const freqCol = await requireCollection<any>(db, 'frequency');

    const moodsArr: string[] = Array.isArray(moods) ? moods.map(String).filter(Boolean) : [];

    // Präferenzen laden
    const freqDoc = await freqCol.findOne({ userId, type:'frequency' }, { projection: { baseMoodPreferences: 1 } });
    const prefs: Array<{ label: string; preference?: 'like'|'neutral'|'dislike' }> = Array.isArray(freqDoc?.baseMoodPreferences) ? freqDoc!.baseMoodPreferences : [];

    const prefMap = new Map<string, number>();
    for (const p of prefs) {
      const v = p?.preference === 'like' ? 1 : p?.preference === 'dislike' ? -1 : 0;
      if (p?.label) prefMap.set(p.label, v);
    }

    // Score: Mittelwert der Präferenzwerte der ausgewählten Moods (−1..+1)
    let score = 0;
    if (moodsArr.length) {
      const vals = moodsArr.map(m => prefMap.get(m) ?? 0);
      score = vals.reduce((s, v) => s + v, 0) / vals.length; // −1..+1
    }

    const now = new Date();
    await appData.updateOne(
      { userId, type:'frequency_baseMood_log', date, timeOfDay },
      {
        $set: { userId, type:'frequency_baseMood_log', date, timeOfDay, moods: moodsArr, score, updatedAt: now },
        $setOnInsert: { createdAt: now }
      },
      { upsert: true }
    );

    return res.status(200).json({ ok:true, date, timeOfDay, score });
  } catch (err: any) {
    console.error('[logBaseMood] error', err);
    return res.status(500).json({ ok:false, error: err?.message || 'Unknown error' });
  }
}
