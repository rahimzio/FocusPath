// pages/api/trading/mistakes/[userId].ts
import type { NextApiRequest, NextApiResponse } from "next";
import { connectToDatabase } from "../../db/connectToDatabase";

const clampRange = (v?: string) => (v === "week" || v === "all" ? v : "month");
const toDate10 = (s?: string | null) => (s ? String(s).slice(0, 10) : undefined);
const iso10 = (d: Date) => d.toISOString().slice(0, 10);

function calcFromTo(range: "week" | "month" | "all", fromQ?: string | null, toQ?: string | null) {
  const today = new Date();
  const to = toQ ? new Date(toDate10(toQ)! + "T23:59:59.999Z") : today;
  if (fromQ) return { from: new Date(toDate10(fromQ)! + "T00:00:00.000Z"), to };
  if (range === "all") return { from: undefined as Date | undefined, to };
  const d = new Date(to);
  if (range === "week") d.setUTCDate(d.getUTCDate() - 6); // inkl. heute = 7 Tage
  else d.setUTCDate(d.getUTCDate() - 29);                 // inkl. heute = 30 Tage
  d.setUTCHours(0, 0, 0, 0);
  return { from: d, to };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ message: "Method not allowed" });

  const {
    userId,
    accountId,
    strategy,
    includeArchived,
    range: rangeQ,
    from: fromQ,
    to: toQ,
    status, // optional: 'draft' | 'final'
  } = req.query as Record<string, string | undefined>;

  if (!userId || typeof userId !== "string") {
    return res.status(400).json({ message: "Missing userId" });
  }

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
        col.createIndex({ userId: 1, tradingMistakes: 1 }),
      ]);
    } catch {}

    const range = clampRange(rangeQ);
    const { from, to } = calcFromTo(range, fromQ, toQ);

    // Basis-Match
    const match: any = {
      userId,
      deleted: { $ne: true },
      ...(includeArchived === "true" ? {} : { archived: { $ne: true } }),
      // toleranter type-Guard
      $and: [{ $or: [{ type: "tradeEntry" }, { type: "trade" }, { type: { $exists: false } }] }],
      // Fehler müssen existieren/nicht leer sein
      tradingMistakes: { $exists: true, $ne: [] },
    };

    // optionale Filter
    if (accountId) match.$and.push({ accountId });
    if (strategy) match.$and.push({ $or: [{ strategy }, { strategy_name: strategy }] });
    if (status === "draft") match.$and.push({ $or: [{ status: "draft" }, { completed: { $ne: true } }] });
    if (status === "final") match.$and.push({ $or: [{ status: "final" }, { completed: true }] });

    // Pipeline
    const pipeline: any[] = [
      { $match: match },
      // robustes Datum für Range-Filter
      {
        $addFields: {
          _date: {
            $ifNull: [
              { $convert: { input: "$date", to: "date", onError: null, onNull: null } },
              { $convert: { input: "$createdAt", to: "date", onError: null, onNull: null } },
            ],
          },
        },
      },
    ];

    // optionales Datumsfenster (auf _dateStr, um Strings sicher zu vergleichen)
    if (from || to) {
      pipeline.push({
        $addFields: {
          _dateStr: {
            $cond: [
              { $ne: ["$_date", null] },
              { $dateToString: { format: "%Y-%m-%d", date: "$_date" } },
              null,
            ],
          },
        },
      });
      const cond: any = {};
      if (from) cond.$gte = iso10(from);
      if (to) cond.$lte = iso10(to);
      pipeline.push({ $match: { _dateStr: cond } });
    }

    // Fehler-Array aufsplitten
    pipeline.push({ $unwind: "$tradingMistakes" });

    // Case-insensitive zählen
    pipeline.push({
      $addFields: {
        _mistake_low: { $toLower: { $trim: { input: "$tradingMistakes" } } },
      },
    });

    pipeline.push({
      $group: {
        _id: "$_mistake_low",
        count: { $sum: 1 },
      },
    });

    // Ausgabe-Shape
    pipeline.push({
      $project: {
        _id: 0,
        mistake_type: "$_id",
        count: 1,
      },
    });

    pipeline.push({ $sort: { count: -1, mistake_type: 1 } });

    const data = await col.aggregate(pipeline).toArray();
    return res.status(200).json(data);
  } catch (e) {
    console.error("mistakes endpoint error:", e);
    return res.status(500).json({ message: "Internal server error" });
  }
}
