// pages/api/trading/monthly.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { MongoClient } from "mongodb";
import { getMonthFourSegments, getMonthPeriod } from "@/utils/time/periods";

const uri = process.env.MONGODB_URI!; const dbName = process.env.MONGODB_DB || "app";
let _client: MongoClient | null = null;
async function getClient(){ if(_client) return _client; _client = await new MongoClient(uri).connect(); return _client; }

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { userId, month } = req.query as { userId: string; month: string };
    if (!userId || !month) return res.status(400).json({ error: "userId & month required" });

    const client = await getClient(); const db = client.db(dbName);
    const Weekly  = db.collection("weekly_reflections");
    const Monthly = db.collection("monthly_reflections");

    const existing = await Monthly.findOne({ userId, month }, { projection: { _id: 0 } });
    if (existing) return res.status(200).json(existing);

    const segs  = getMonthFourSegments(month);
    const weeks = await Weekly.find({ userId, label: { $in: segs.map(s=>s.label) } }, { projection: { _id: 0 } }).toArray();

    const safe = weeks.filter((w:any)=>!w.missing);
    const sum  = (a:number[],f=(x:number)=>x)=>a.reduce((p,c)=>p+f(c),0);

    const trades = sum(safe.map((w:any)=>w.kpis?.trades||0));
    const pnl    = sum(safe.map((w:any)=>w.kpis?.pnl||0));
    const wins   = sum(safe.map((w:any)=>Math.round((w.kpis?.winrate||0)*(w.kpis?.trades||0))));
    const days   = sum(safe.map((w:any)=>w.kpis?.daysTraded||0));
    const sumR   = sum(safe.map((w:any)=> (w.kpis?.avgR||0) * (w.kpis?.trades||0)));
    const avgR   = trades ? sumR / trades : 0;
    const winrate= trades ? wins / trades : 0;

    const kpis = {
      trades, pnl, winrate, avgR,
      expectancyR: avgR,
      maxDD: Math.max(...safe.map((w:any)=>w.kpis?.maxDD||0), 0),
      daysTraded: days,
      complianceAvg: safe.length ? Math.round(sum(safe.map((w:any)=>w.processKPIs?.complianceAvg||0))/safe.length) : 0,
      gameAvg: {
        A: Math.round(safe.length ? sum(safe.map((w:any)=>w.kpis?.gameAvg?.A||0))/safe.length : 0),
        B: Math.round(safe.length ? sum(safe.map((w:any)=>w.kpis?.gameAvg?.B||0))/safe.length : 0),
        C: Math.round(safe.length ? sum(safe.map((w:any)=>w.kpis?.gameAvg?.C||0))/safe.length : 0),
      },
      tiltSessions: sum(safe.map((w:any)=>w.kpis?.tiltSessions||0))
    };

    const processKPIs = safe.length ? {
      complianceAvg: Math.round(sum(safe.map((w:any)=>w.processKPIs?.complianceAvg||0))/safe.length),
      setupValidityRate: (sum(safe.map((w:any)=>w.processKPIs?.setupValidityRate||0)))/(safe.length||1),
      riskAdherenceRate: (sum(safe.map((w:any)=>w.processKPIs?.riskAdherenceRate||0)))/(safe.length||1),
      executionTimingDist: ["early","ok","late"].reduce((acc:any,k)=>{ acc[k]=safe.reduce((s:any,w:any)=>s+((w.processKPIs?.executionTimingDist?.[k])||0),0); return acc; },{}),
      matrix: ["goodProcess_goodOutcome","goodProcess_badOutcome","badProcess_goodOutcome","badProcess_badOutcome"].reduce((acc:any,k)=>{ acc[k]=safe.reduce((s:any,w:any)=>s+(w.processKPIs?.matrix?.[k]||0),0); return acc; },{}),
      pqi: Math.round(sum(safe.map((w:any)=>w.processKPIs?.pqi||0))/safe.length)
    } : null;

    const doc = {
      userId, month,
      period: getMonthPeriod(month),
      weeks: segs.map(seg => weeks.find((w:any)=>w.label===seg.label) || { label: seg.label, period: { start: seg.start, end: seg.end }, missing: true }),
      kpis, processKPIs,
      createdAt: new Date().toISOString()
    };

    await Monthly.updateOne({ userId, month }, { $set: doc }, { upsert: true });
    res.status(200).json(doc);
  } catch (e) {
    console.error(e); res.status(500).json({ error: "internal_error" });
  }
}
