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

    // Indizes (idempotent)
    try {
      await Promise.all([
        col.createIndex({ userId: 1, type: 1, date: 1 }),
        col.createIndex({ userId: 1, type: 1, createdAt: 1 }),
        col.createIndex({ userId: 1, archived: 1, deleted: 1 }),
        col.createIndex({ userId: 1, strategy: 1, date: 1 }),
        col.createIndex({ userId: 1, strategy_name: 1, date: 1 }),
      ]);
    } catch {}

    const userId = String(req.query.userId || "").trim();
    if (!userId) return res.status(400).json({ error: "userId ist erforderlich" });

    const accountId = typeof req.query.accountId === "string" && req.query.accountId.trim() ? req.query.accountId : undefined;
    const strategy  = typeof req.query.strategy === "string"  && req.query.strategy.trim()  ? req.query.strategy  : undefined;
    const includeArchived = req.query.includeArchived === "true";
    const status = (typeof req.query.status === "string" ? req.query.status : undefined) as "draft" | "final" | undefined;

    const fromQ = toD10(req.query.from);
    const toQ   = toD10(req.query.to);

    // Range-Grenzen als echte Dates
    const fromDate = fromQ ? new Date(fromQ + "T00:00:00.000Z") : undefined;
    const toDate   = toQ   ? new Date(toQ   + "T23:59:59.999Z") : undefined;

    // Basis-Match (ohne Datumsfilter – den machen wir nach Normalisierung)
    const match: any = {
      userId,
      deleted: { $ne: true },
      ...(includeArchived ? {} : { archived: { $ne: true } }),
      $and: [
        { $or: [{ type: "tradeEntry" }, { type: "trade" }, { type: { $exists: false } }] },
      ],
    };
    if (accountId) match.$and.push({ accountId });
    if (strategy)  match.$and.push({ $or: [{ strategy }, { strategy_name: strategy }] });
    if (status === "draft") match.$and.push({ $or: [{ status: "draft" }, { completed: { $ne: true } }] });
    if (status === "final") match.$and.push({ $or: [{ status: "final" }, { completed: true }] });
    if (match.$and.length === 1) delete match.$and;

    // Gemeinsame Normalisierung
    const normalizeStage = {
      $addFields: {
        _date: {
          $ifNull: [
            { $convert: { input: "$date",      to: "date", onError: null, onNull: null } },
            { $convert: { input: "$createdAt", to: "date", onError: null, onNull: null } },
          ],
        },
        _pnl: { $convert: { input: "$pnl", to: "double", onError: 0, onNull: 0 } },
        _resultNorm: {
          $switch: {
            branches: [
              { case: { $in: [{ $toLower: { $ifNull: ["$result", ""] } }, ["win", "winner", "profit", "green"]] }, then: "win" },
              { case: { $in: [{ $toLower: { $ifNull: ["$result", ""] } }, ["loss", "loser", "red", "lose"]] }, then: "loss" },
              { case: { $in: [{ $toLower: { $ifNull: ["$result", ""] } }, ["be", "breakeven", "break-even", "break even"]] }, then: "BE" },
            ],
            default: "",
          },
        },
      },
    };

    const rangeMatchStage = (fromDate || toDate)
      ? { $match: { _date: { ...(fromDate ? { $gte: fromDate } : {}), ...(toDate ? { $lte: toDate } : {}) } } }
      : null;

    // ---- Monatsaggregation
    const monthsAgg = await col.aggregate([
      { $match: match },
      normalizeStage,
      ...(rangeMatchStage ? [rangeMatchStage] : []),
      { $addFields: { _month: { $dateToString: { format: "%Y-%m", date: "$_date" } } } },
      {
        $group: {
          _id: "$_month",
          trades: { $sum: 1 },
          pnl:    { $sum: "$_pnl" },
          wins:   { $sum: { $cond: [{ $eq: ["$_resultNorm", "win"] }, 1, 0] } },
          losses: { $sum: { $cond: [{ $eq: ["$_resultNorm", "loss"] }, 1, 0] } },
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
          avgPnl: 1,
          // Winrate korrekt: ohne BE / ohne undefined
          winrate: {
            $let: {
              vars: { denom: { $add: ["$wins", "$losses"] } },
              in: { $cond: [{ $gt: ["$$denom", 0] }, { $divide: ["$wins", "$$denom"] }, 0] },
            },
          },
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

    // ---- avgRiskReward (mit identischem Filter)
    const rrDocs = await col.aggregate([
      { $match: match },
      normalizeStage,
      ...(rangeMatchStage ? [rangeMatchStage] : []),
      { $project: { _id: 0, riskReward: 1 } },
    ]).toArray();

    let rrSum = 0, rrCnt = 0;
    for (const d of rrDocs as any[]) {
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
