import type { NextApiRequest, NextApiResponse } from 'next';
import { connectToDatabase } from '../db/connectToDatabase';
import { requireCollection } from '@/lib/requireCollection';

type Pref = 'like'|'neutral'|'dislike';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') { res.setHeader('Allow','POST'); return res.status(405).json({ ok:false, error:'Method Not Allowed' }); }
  try {
    const { userId, label, preference } = req.body ?? {};
    if (!userId || !label) return res.status(400).json({ ok:false, error:'Missing userId or label' });
    const pref: Pref = ['like','neutral','dislike'].includes(preference) ? preference : 'neutral';

    const { db } = await connectToDatabase();
    const freqCol = await requireCollection<any>(db, 'frequency');

    const now = new Date();
    const doc = await freqCol.findOne({ userId, type:'frequency' }, { projection: { baseMoodPreferences:1 } });

    const arr: Array<{label:string;preference?:Pref}> = Array.isArray(doc?.baseMoodPreferences) ? doc!.baseMoodPreferences : [];
    const exists = arr.findIndex(x => x.label === label);

    if (exists >= 0) {
      arr[exists] = { label, preference: pref };
    } else {
      arr.push({ label, preference: pref });
    }

    await freqCol.updateOne(
      { userId, type:'frequency' },
      {
        $set: { baseMoodPreferences: arr, 'metrics.updatedAt': now },
        $setOnInsert: { userId, type:'frequency', createdAt: now, version: 1 }
      },
      { upsert: true }
    );

    return res.status(200).json({ ok:true, added: exists<0, label, preference: pref });
  } catch (err:any) {
    console.error('[addCustomMood] error', err);
    return res.status(500).json({ ok:false, error: err?.message || 'Unknown error' });
  }
}
