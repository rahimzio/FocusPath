// pages/api/trading/quarterly.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { MongoClient } from "mongodb";
import { getQuarterMonths, quarterPeriod } from "@/utils/time/periods";

const uri = process.env.MONGODB_URI!; const dbName = process.env.MONGODB_DB || "app";
let _client: MongoClient | null = null;
async function getClient(){ if(_client) return _client; _client = await new MongoClient(uri).connect(); return _client; }

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { userId, quarter } = req.query as { userId: string; quarter: string };
    if (!userId || !quarter) return res.status(400).json({ error: "userId & quarter required" });

    const client = await getClient(); const db = client.db(dbName);
    const Monthly   = db.collection("monthly_reflections");
    const Quarterly = db.collection("quarterly_reflections");

    const existing = await Quarterly.findOne({ userId, quarter }, { projection: { _id: 0 } });
    if (existing) return res.status(200).json(existing);

    const months = getQuarterMonths(quarter);
    const monthDocs = await Monthly.find({ userId, month: { $in: months } }, { projection: { _id: 0 } }).toArray();

    const sum = (arr:number[]) => arr.reduce((a,b)=>a+b,0);
    const trades = sum(monthDocs.map((m:any)=>m.kpis?.trades||0));
    const pnl    = sum(monthDocs.map((m:any)=>m.kpis?.pnl||0));
    const wins   = sum(monthDocs.map((m:any)=>Math.round((m.kpis?.winrate||0)*(m.kpis?.trades||0))));
    const days   = sum(monthDocs.map((m:any)=>m.kpis?.daysTraded||0));
    const sumR   = sum(monthDocs.map((m:any)=> (m.kpis?.avgR||0) * (m.kpis?.trades||0)));
    const avgR   = trades ? sumR/trades : 0;
    const winrate= trades ? wins/trades : 0;

    const kpis = {
      trades, pnl, winrate, avgR,
      expectancyR: avgR,
      maxDD: Math.max(...monthDocs.map((m:any)=>m.kpis?.maxDD||0), 0),
      daysTraded: days,
      complianceAvg: monthDocs.length ? Math.round(sum(monthDocs.map((m:any)=>m.kpis?.complianceAvg||0))/monthDocs.length) : 0,
      gameAvg: {
        A: Math.round(monthDocs.length ? sum(monthDocs.map((m:any)=>m.kpis?.gameAvg?.A||0))/monthDocs.length : 0),
        B: Math.round(monthDocs.length ? sum(monthDocs.map((m:any)=>m.kpis?.gameAvg?.B||0))/monthDocs.length : 0),
        C: Math.round(monthDocs.length ? sum(monthDocs.map((m:any)=>m.kpis?.gameAvg?.C||0))/monthDocs.length : 0),
      },
      tiltSessions: sum(monthDocs.map((m:any)=>m.kpis?.tiltSessions||0))
    };

    const processKPIs = monthDocs.length ? {
      complianceAvg: Math.round(sum(monthDocs.map((m:any)=>m.processKPIs?.complianceAvg||0))/monthDocs.length),
      setupValidityRate: (sum(monthDocs.map((m:any)=>m.processKPIs?.setupValidityRate||0)))/(monthDocs.length||1),
      riskAdherenceRate: (sum(monthDocs.map((m:any)=>m.processKPIs?.riskAdherenceRate||0)))/(monthDocs.length||1),
      executionTimingDist: ["early","ok","late"].reduce((acc:any,k)=>{ acc[k]=monthDocs.reduce((s:any,m:any)=>s+((m.processKPIs?.executionTimingDist?.[k])||0),0); return acc; },{}),
      matrix: ["goodProcess_goodOutcome","goodProcess_badOutcome","badProcess_goodOutcome","badProcess_badOutcome"].reduce((acc:any,k)=>{ acc[k]=monthDocs.reduce((s:any,m:any)=>s+(m.processKPIs?.matrix?.[k]||0),0); return acc; },{}),
      pqi: Math.round(sum(monthDocs.map((m:any)=>m.processKPIs?.pqi||0))/monthDocs.length)
    } : null;

    const doc = {
      userId, quarter,
      period: quarterPeriod(quarter),
      months: monthDocs,
      kpis, processKPIs,
      createdAt: new Date().toISOString()
    };

    await Quarterly.updateOne({ userId, quarter }, { $set: doc }, { upsert: true });
    res.status(200).json(doc);
  } catch (e) {
    console.error(e); res.status(500).json({ error: "internal_error" });
  }
}
