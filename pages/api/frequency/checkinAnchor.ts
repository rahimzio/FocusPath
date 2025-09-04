import type { NextApiRequest as Req3, NextApiResponse as Res3 } from 'next'
import { connectToDatabase as connect3 } from '../db/connectToDatabase'
import { requireCollection as require3 } from '@/lib/requireCollection'
import { todayYMD } from '@/utils/frequenz/frequencyTypes';

export default async function checkinAnchor(req: Req3, res: Res3){
  if (req.method !== 'POST') { res.setHeader('Allow','POST'); return res.status(405).json({ ok:false, error:'Method Not Allowed' }) }
  try{
    const { userId, kind, label, done = true } = req.body ?? {}
    if (!userId || !['frequency','concentration'].includes(kind) || !label){
      return res.status(400).json({ ok:false, error:'Missing/invalid fields' })
    }
    const { db } = await connect3()
    const appData = await require3<any>(db, 'appData')
    const now = new Date()
    await appData.insertOne({ type:'anchor_checkin', userId, date: todayYMD(now), kind, label, done: !!done, createdAt: now })
    return res.status(200).json({ ok:true })
  }catch(err:any){
    console.error('[checkinAnchor] error', err)
    return res.status(500).json({ ok:false, error: err?.message || 'Unknown error' })
  }
}
