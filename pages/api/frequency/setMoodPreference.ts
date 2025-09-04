import type { NextApiRequest, NextApiResponse } from 'next'
import { connectToDatabase } from '../db/connectToDatabase'
import { requireCollection } from '@/lib/requireCollection'

export default async function setMoodPreference(req: NextApiRequest, res: NextApiResponse){
  if (req.method !== 'POST') { res.setHeader('Allow','POST'); return res.status(405).json({ ok:false, error:'Method Not Allowed' }) }
  try{
    const { userId, label, preference } = req.body ?? {}
    if (!userId || !label || !['gern','egal','nicht'].includes(preference)){
      return res.status(400).json({ ok:false, error:'Missing/invalid fields' })
    }
    const { db } = await connectToDatabase()
    const col = await requireCollection<any>(db, 'frequency')
    const now = new Date()

    // merge preference (by label)
    await col.updateOne(
      { userId, type:'frequency' },
      {
        $setOnInsert: { type:'frequency', userId, createdAt: now, version: 2 },
        $set: { updatedAt: now },
        $pull: { baseMoodPreferences: { label } },
      }
    )
    const up = await col.updateOne(
      { userId, type:'frequency' },
      { $push: { baseMoodPreferences: { label, preference } }, $set: { updatedAt: now } },
      { upsert: true }
    )
    return res.status(200).json({ ok:true, modified: (up.modifiedCount ?? 0) + (up.upsertedCount ?? 0) })
  }catch(err:any){
    console.error('[setMoodPreference] error', err)
    return res.status(500).json({ ok:false, error: err?.message || 'Unknown error' })
  }
}
