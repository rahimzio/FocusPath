// pages/api/trading/weekly/compute.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI!; const dbName = process.env.MONGODB_DB || "app";
let _client: MongoClient | null = null;
async function getClient(){ if(_client) return _client; _client = await new MongoClient(uri).connect(); return _client; }

const GOOD_PROCESS_MIN = 80; // Compliance-Threshold

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();
  try {
    const { userId, label, period } = req.body as { userId: string; label: string; period: { start: string; end: string } };
    if (!userId || !label || !period?.start || !period?.end) return res.status(400).json({ error: "userId, label, period required" });

    const client = await getClient(); const db = client.db(dbName);
    const Trades  = db.collection("trades");
    const Dailies = db.collection("daily_reflections");
    const Weekly  = db.collection("weekly_reflections");

    const tradesAgg = await Trades.aggregate([
      { $match: { userId, date: { $gte: period.start, $lt: period.end } } },
      { $project: { rMultiple:1, pnl:1, setup:1, session:1, date:1, complianceScore:1, game:1, setupValid:1, riskAdhered:1, executionTiming:1 } },
      { $facet: {
        base: [
          { $group: {
            _id:null,
            trades:{ $sum:1 },
            pnl:{ $sum:"$pnl" },
            wins:{ $sum:{ $cond:[{ $gt:["$rMultiple",0] },1,0] } },
            losses:{ $sum:{ $cond:[{ $lte:["$rMultiple",0] },1,0] } },
            sumR:{ $sum:"$rMultiple" },
            compAvg:{ $avg:"$complianceScore" },
            setupValidRate:{ $avg:{ $cond:["$setupValid",1,0] } },
            riskAdhRate:{ $avg:{ $cond:["$riskAdhered",1,0] } },
            early:{ $sum:{ $cond:[{ $eq:["$executionTiming","early"] },1,0] } },
            ok:{ $sum:{ $cond:[{ $eq:["$executionTiming","ok"] },1,0] } },
            late:{ $sum:{ $cond:[{ $eq:["$executionTiming","late"] },1,0] } },
            gp_go:{ $sum:{ $cond:[{ $and:[{ $gte:["$complianceScore",GOOD_PROCESS_MIN] },{ $gt:["$rMultiple",0] }] },1,0] } },
            gp_bo:{ $sum:{ $cond:[{ $and:[{ $gte:["$complianceScore",GOOD_PROCESS_MIN] },{ $lte:["$rMultiple",0] }] },1,0] } },
            bp_go:{ $sum:{ $cond:[{ $and:[{ $lt:["$complianceScore",GOOD_PROCESS_MIN] },{ $gt:["$rMultiple",0] }] },1,0] } },
            bp_bo:{ $sum:{ $cond:[{ $and:[{ $lt:["$complianceScore",GOOD_PROCESS_MIN] },{ $lte:["$rMultiple",0] }] },1,0] } },
          }}],
        byGame: [
          { $group: {
            _id:"$game",
            trades:{ $sum:1 },
            wins:{ $sum:{ $cond:[{ $gt:["$rMultiple",0] },1,0] } },
            losses:{ $sum:{ $cond:[{ $lte:["$rMultiple",0] },1,0] } },
            sumR:{ $sum:"$rMultiple" },
            compAvg:{ $avg:"$complianceScore" },
            avgR_win:{ $avg:{ $cond:[{ $gt:["$rMultiple",0] },"$rMultiple",null] } },
            avgR_loss:{ $avg:{ $cond:[{ $lte:["$rMultiple",0] },"$rMultiple",null] } },
          }},
          { $project: {
            game:"$_id", _id:0, trades:1, wins:1, losses:1, compAvg:1,
            avgR:{ $cond:[{ $gt:["$trades",0] },{ $divide:["$sumR","$trades"] },0] },
            winrate:{ $cond:[{ $gt:["$trades",0] },{ $divide:["$wins","$trades"] },0] },
            expectancyR:{
              $let:{
                vars:{ p:{ $cond:[{ $gt:["$trades",0] },{ $divide:["$wins","$trades"] },0] }, rW:"$avgR_win", rL:"$avgR_loss" },
                in:{ $subtract:[{ $multiply:["$$p",{ $ifNull:["$$rW",0] }] },{ $multiply:[{ $subtract:[1,"$$p"] },{ $abs:{ $ifNull:["$$rL",0] } }] }] }
              }
            }
          }}
        ]
      }},
      { $project: { base:{ $arrayElemAt:["$base",0] }, byGame:1 } }
    ]).toArray();

    const base = tradesAgg[0]?.base || { trades:0, pnl:0, wins:0, sumR:0, compAvg:0 };
    const byGame = tradesAgg[0]?.byGame || [];
    const trades = base.trades || 0;
    const winrate = trades ? (base.wins||0) / trades : 0;
    const avgR = trades ? (base.sumR||0) / trades : 0;

    const dailies = await Dailies.find(
      { userId, date: { $gte: period.start, $lt: period.end } },
      { projection: { date:1, abcg:1, discipline:1, tilt:1 } }
    ).toArray();

    const doc = {
      userId, label, period,
      kpis: {
        trades, pnl: base.pnl||0, winrate,
        expectancyR: avgR, avgR, maxDD: 0 /* optional nachziehen */, daysTraded: dailies.length,
        complianceAvg: Math.round(base.compAvg||0),
        gameAvg: { A:0, B:0, C:0 }, // optional mit Tageswerten befüllen
        tiltSessions: (dailies||[]).filter((d:any)=>d.tilt).length
      },
      gameStats: {
        byGame,
        overall: {
          A: byGame.find((g:any)=>g.game==="A")?.trades || 0,
          B: byGame.find((g:any)=>g.game==="B")?.trades || 0,
          C: byGame.find((g:any)=>g.game==="C")?.trades || 0,
        }
      },
      processKPIs: {
        complianceAvg: Math.round(base.compAvg||0),
        setupValidityRate: base.setupValidRate ?? null,
        riskAdherenceRate: base.riskAdhRate ?? null,
        executionTimingDist: { early: base.early||0, ok: base.ok||0, late: base.late||0 },
        matrix: {
          goodProcess_goodOutcome: base.gp_go||0,
          goodProcess_badOutcome:  base.gp_bo||0,
          badProcess_goodOutcome:  base.bp_go||0,
          badProcess_badOutcome:   base.bp_bo||0,
        },
        pqi: Math.round(
          100 * (
            0.6 * ((base.compAvg ?? 0) / 100) +
            0.2 * (base.setupValidRate ?? 0) +
            0.2 * (base.riskAdhRate ?? 0)
          )
        )
      },
      miniDaily: dailies.map((d:any)=>({ date:d.date, abcg:d.abcg, discipline: d.discipline, tilt: !!d.tilt })),
      createdAt: new Date().toISOString()
    };

    await Weekly.updateOne({ userId, label }, { $set: doc }, { upsert: true });
    res.status(200).json(doc);
  } catch (e) {
    console.error(e); res.status(500).json({ error: "internal_error" });
  }
}
