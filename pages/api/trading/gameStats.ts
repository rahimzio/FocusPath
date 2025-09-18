// pages/api/trading/gameStats.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { connectToDatabase } from "../db/mongo";

type Grade = "A" | "B" | "C";
type Result = "win" | "loss" | "BE";

function parseRange(range?: string) {
  const now = new Date();
  const to = now;
  let from: Date | undefined;
  if (range === "all") from = undefined;
  else if (range === "month") from = new Date(now.getTime() - 30 * 24 * 3600 * 1000);
  else from = new Date(now.getTime() - 7 * 24 * 3600 * 1000); // default: week
  return { from, to };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ message: "Method not allowed" });
  const { userId, range = "week" } = req.query as { userId?: string; range?: string };

  if (!userId) return res.status(400).json({ message: "Missing userId" });

  const t0 = Date.now();
  console.log("[API gameStats] →", { userId, range, ts: new Date().toISOString() });

  try {
    const { db } = await connectToDatabase();
    const col = db.collection("trading");

    // defensive indexes (idempotent)
    try {
      await Promise.all([
        col.createIndex({ userId: 1, type: 1, createdAt: 1 }),
        col.createIndex({ userId: 1, type: 1, date: 1 }),
        col.createIndex({ userId: 1, archived: 1, deleted: 1 }),
      ]);
    } catch {}

    // Fenster berechnen
    const { from, to } = parseRange(range);
    console.log("[API gameStats] window =", { from, to });

    // -------- Trades per Aggregation (robust) --------
    const matchTrades: any = {
      $and: [
        { userId },
        { deleted: { $ne: true } },
        { archived: { $ne: true } },
        { $or: [{ type: "tradeEntry" }, { type: "trade" }, { type: { $exists: false } }] },
      ],
    };

    const rangeCond: any = {};
    if (from) rangeCond.$gte = from;
    if (to)   rangeCond.$lte = to;

    const aggPipeline: any[] = [
      { $match: matchTrades },
      {
        $addFields: {
          _createdAt: { $convert: { input: "$createdAt", to: "date", onError: null, onNull: null } },
          _date: {
            $ifNull: [
              { $convert: { input: "$date", to: "date", onError: null, onNull: null } },
              { $convert: { input: "$createdAt", to: "date", onError: null, onNull: null } },
            ],
          },
          _grade: {
            $let: {
              vars: { g: { $toUpper: { $ifNull: ["$gameComputed", "C"] } } },
              in: { $cond: [{ $in: ["$$g", ["A", "B", "C"]] }, "$$g", "C"] },
            },
          },
          _resultNorm: {
            $switch: {
              branches: [
                { case: { $in: [{ $toLower: { $ifNull: ["$result", ""] } }, ["win", "winner", "profit", "green"]] }, then: "win" },
                { case: { $in: [{ $toLower: { $ifNull: ["$result", ""] } }, ["loss", "loser", "red", "lose"]] },   then: "loss" },
                { case: { $in: [{ $toLower: { $ifNull: ["$result", ""] } }, ["be", "breakeven", "break-even", "break even"]] }, then: "BE" },
              ],
              default: "", // fehlendes/unklares Result
            },
          },
        },
      },
    ];

    // Zeitfenster auf _date anwenden (date oder createdAt, je nachdem was vorhanden ist)
    if (from || to) {
      const cond: any = {};
      if (from) cond.$gte = from;
      if (to)   cond.$lte = to;
      aggPipeline.push({ $match: { _date: cond } });
    }

    // Zähle nach Grade und nach Grade×Result
    aggPipeline.push({
      $facet: {
        byGrade: [
          { $group: { _id: "$_grade", c: { $sum: 1 } } },
        ],
        byGradeResult: [
          { $match: { _resultNorm: { $in: ["win", "loss", "BE"] } } }, // nur gültige Results
          { $group: { _id: { g: "$_grade", r: "$_resultNorm" }, c: { $sum: 1 } } },
        ],
        total: [
          { $group: { _id: null, c: { $sum: 1 } } },
        ],
      },
    });

    const [stats] = await col.aggregate(aggPipeline).toArray();

    const counts: Record<Grade, number> = { A: 0, B: 0, C: 0 };
    for (const row of stats?.byGrade ?? []) {
      const g = String(row._id || "C") as Grade;
      if (g === "A" || g === "B" || g === "C") counts[g] = Number(row.c || 0);
    }

    const byResult: Record<Grade, Record<Result, number>> = {
      A: { win: 0, loss: 0, BE: 0 },
      B: { win: 0, loss: 0, BE: 0 },
      C: { win: 0, loss: 0, BE: 0 },
    };
    for (const row of stats?.byGradeResult ?? []) {
      const g = String(row._id?.g || "C") as Grade;
      const r = String(row._id?.r || "") as Result;
      if ((g === "A" || g === "B" || g === "C") && (r === "win" || r === "loss" || r === "BE")) {
        byResult[g][r] = Number(row.c || 0);
      }
    }

    const totalTrades = Number(stats?.total?.[0]?.c || 0);
    console.log("[API gameStats] counts (trades) =", counts, "totalTrades=", totalTrades);

    // -------- Daily Ratings (type: day_reflection) --------
    const dayMatch: any = {
      userId,
      type: "day_reflection",
      deleted: { $ne: true },
      archived: { $ne: true },
    };
    if (from || to) {
      const dateRange: any = {};
      if (from) dateRange.$gte = from.toISOString().slice(0, 10);
      if (to)   dateRange.$lte = to.toISOString().slice(0, 10);
      dayMatch.date = dateRange; // date ist 'YYYY-MM-DD'
    }

    const dayCursor = col.find(dayMatch, {
      projection: { _id: 0, dayGrade: 1, date: 1 },
      sort: { date: -1 },
    });

    const dailyCounts: Record<Grade, number> = { A: 0, B: 0, C: 0 };
    let totalDays = 0;
    for await (const d of dayCursor) {
      const g: Grade = (typeof d.dayGrade === "string" && ["A", "B", "C"].includes(d.dayGrade)) ? d.dayGrade as Grade : "C";
      dailyCounts[g] += 1;
      totalDays += 1;
    }

    console.log("[API gameStats] daily (day_reflection) =", dailyCounts, "totalDays=", totalDays);

    // -------- Ergebnis aufbereiten --------
    const proportions = totalTrades
      ? { A: counts.A / totalTrades, B: counts.B / totalTrades, C: counts.C / totalTrades }
      : { A: 0, B: 0, C: 0 };

    const payload = {
      // Trades
      total: totalTrades,
      counts,            // {A,B,C} Stückzahlen aus trades
      proportions,       // relative Verteilung A/B/C aus trades
      byResult,          // nach Result differenziert

      // Daily Ratings (day_reflection)
      daily: {
        totalDays,
        counts: dailyCounts, // {A,B,C} Stückzahlen der Tagesbewertungen
      },
    };

    console.log("[API gameStats] ← 200 payload =", payload, "in", (Date.now() - t0) + "ms");
    return res.status(200).json(payload);
  } catch (err: any) {
    console.error("[API gameStats] ERROR", err?.message, err);
    return res.status(500).json({ message: err?.message ?? "Internal server error" });
  }
}
