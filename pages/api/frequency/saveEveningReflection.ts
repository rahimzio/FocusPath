import type { NextApiRequest, NextApiResponse } from 'next';
import { connectToDatabase } from '../db/connectToDatabase';
import { requireCollection } from '@/lib/requireCollection';

function toYMD(d = new Date()){ return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,10) }

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') { res.setHeader('Allow','POST'); return res.status(405).json({ ok:false, error:'Method Not Allowed' }); }
  try {
    const { userId, date: dateProp, delta, details, snapshot } = req.body ?? {};
    if (!userId) return res.status(400).json({ ok:false, error:'Missing userId' });
    const date = (typeof dateProp==='string' && /\d{4}-\d{2}-\d{2}/.test(dateProp)) ? dateProp : toYMD();

    const { db } = await connectToDatabase();
    const appData = await requireCollection<any>(db, 'appData');

    const now = new Date();
    await appData.updateOne(
      { userId, type:'frequency_reflection', date },
      {
        $set: { userId, type:'frequency_reflection', date, delta: Number(delta)||0, details: details||{}, snapshot: snapshot||{}, updatedAt: now },
        $setOnInsert: { createdAt: now }
      },
      { upsert: true }
    );

    return res.status(200).json({ ok:true });
  } catch (err:any) {
    console.error('[saveEveningReflection] error', err);
    return res.status(500).json({ ok:false, error: err?.message || 'Unknown error' });
  }
}
