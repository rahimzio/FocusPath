// pages/api/trading/monthly/[userId].ts
import type { NextApiRequest, NextApiResponse } from "next";
import { connectToDatabase } from "../../db/mongo";

function toD10(s?: unknown) {
  if (!s) return undefined;
  const d = String(s);
  return d.length >= 10 ? d.slice(0, 10) : undefined;
}

function parseRiskReward(v: any): number | undefined {
  if (v === null || v === undefined) return undefined;
  const s = String(v).trim();
  if (!s) return undefined;
  if (s.includes(":")) {
    const [a, b] = s.split(":").map(Number);
    if (Number.isFinite(a) && Number.isFinite(b) && a !== 0) return b / a;
    return undefined;
  }
  const n = Number(s);
  return Number.isFinite(n) ? n : undefined;
}

function computeMaxDrawdown(eq: number[]) {
  let peak = -Infinity, maxDD = 0;
  for (const e of eq) { if (e > peak) peak = e; const dd = peak - e; if (dd > maxDD) maxDD = dd; }
  return maxDD;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { db } = await connectToDatabase();
    const col = db.collection("trading");

    const userId = String(req.query.userId || "").trim();
    if (!userId) return res.status(400).json({ error: "userId ist erforderlich" });

    const accountId = typeof req.query.accountId === "string" && req.query.accountId.trim() ? req.query.accountId : undefined;
    const strategy = typeof req.query.strategy === "string" && req.query.strategy.trim() ? req.query.strategy : undefined;
    const fromQ = toD10(req.query.from);
    const toQ = toD10(req.query.to);

    const match: any = { type: "tradeEntry", userId, archived: { $ne: true }, deleted: { $ne: true } };
    if (accountId) match.accountId = accountId;
    if (strategy) match.$or = [{ strategy }, { strategy_name: strategy }];
    if (fromQ || toQ) {
      match.date = {};
      if (fromQ) match.date.$gte = fromQ;
      if (toQ) match.date.$lte = toQ;
    }

    // Monatsaggregation (OHNE $function)
    const monthsAgg = await col.aggregate([
      { $match: match },
      {
        $addFields: {
          _dateStr: {
            $cond: [
              { $and: [{ $ne: ["$date", null] }, { $ne: ["$date", ""] }] },
              { $substrCP: ["$date", 0, 10] },
              { $substrCP: ["$createdAt", 0, 10] },
            ],
          },
          _pnl: { $toDouble: { $ifNull: ["$pnl", 0] } },
          _isWin: { $eq: ["$result", "win"] },
        },
      },
      { $addFields: { _month: { $substrCP: ["$_dateStr", 0, 7] } } }, // YYYY-MM
      {
        $group: {
          _id: "$_month",
          trades: { $sum: 1 },
          pnl: { $sum: "$_pnl" },
          wins: { $sum: { $cond: ["$_isWin", 1, 0] } },
          avgPnl: { $avg: "$_pnl" },
        },
      },
      { $sort: { _id: 1 } },
      {
        $project: {
          _id: 0,
          month: "$_id",
          trades: 1,
          pnl: 1,
          winrate: { $cond: [{ $gt: ["$trades", 0] }, { $divide: ["$wins", "$trades"] }, 0] },
          avgPnl: 1,
        },
      },
    ]).toArray();

    // Equity + MaxDD
    let eq = 0;
    const eqSeries: number[] = [];
    const months = monthsAgg.map((m: any) => {
      const pnl = Number(m.pnl ?? 0);
      eq += pnl;
      eqSeries.push(eq);
      return {
        month: String(m.month),
        pnl,
        trades: Number(m.trades || 0),
        winrate: Number(m.winrate || 0),
        avgPnl: Number(m.avgPnl || 0),
      };
    });
    const maxDrawdown = computeMaxDrawdown(eqSeries);

    // Ø Risk/Reward OHNE $function → in Node berechnen
    const rrCursor = col.find(match).project({ riskReward: 1, _id: 0 });
    let rrSum = 0, rrCnt = 0;
    for await (const d of rrCursor as any) {
      const rr = parseRiskReward(d?.riskReward);
      if (typeof rr === "number") { rrSum += rr; rrCnt += 1; }
    }
    const avgRiskReward = rrCnt > 0 ? rrSum / rrCnt : 0;

    return res.status(200).json({ months, maxDrawdown, avgRiskReward });
  } catch (err: any) {
    console.error("❌ /api/trading/monthly/[userId]:", err);
    return res.status(500).json({ error: err?.message ?? "Internal Server Error" });
  }
}
