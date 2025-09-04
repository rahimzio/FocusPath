// pages/api/trading/getStats.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { connectToDatabase } from "../db/mongo";

/* helpers */
const clampRange = (v?: string) => (v === "week" || v === "all" ? v : "month");
const toDate10 = (s?: string | null) => (s ? String(s).slice(0, 10) : undefined);
const iso10 = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (d: Date, n: number) => {
  const x = new Date(d);
  x.setUTCDate(x.getUTCDate() + n);
  return x;
};
function calcFromTo(range: "week" | "month" | "all", fromQ?: string | null, toQ?: string | null) {
  const today = new Date();
  const to = toQ ? new Date(toDate10(toQ)! + "T23:59:59.999Z") : today;
  if (fromQ) return { from: new Date(toDate10(fromQ)! + "T00:00:00.000Z"), to };

  if (range === "all") return { from: undefined as Date | undefined, to };
  const d = new Date(to);
  if (range === "week") d.setUTCDate(d.getUTCDate() - 6); // 7 Tage inkl. heute
  else d.setUTCDate(d.getUTCDate() - 29); // 30 Tage inkl. heute
  d.setUTCHours(0, 0, 0, 0);
  return { from: d, to };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { db } = await connectToDatabase();
    const col = db.collection("trading");

    // sinnvolle Indizes (idempotent)
    try {
      await Promise.all([
        col.createIndex({ userId: 1, date: 1 }),
        col.createIndex({ userId: 1, accountId: 1, date: 1 }),
        col.createIndex({ userId: 1, strategy: 1, date: 1 }),
        col.createIndex({ userId: 1, strategy_name: 1, date: 1 }),
        col.createIndex({ userId: 1, archived: 1, deleted: 1 }),
        col.createIndex({ userId: 1, result: 1 }),
      ]);
    } catch {}

    const {
      userId,
      accountId,
      strategy,
      range: rangeQ,
      from: fromQ,
      to: toQ,
      status,           // optional: 'draft' | 'final' | 'all'
      includeArchived,  // optional: 'true' | 'false' (default false)
    } = req.query as Record<string, string | undefined>;

    if (!userId) return res.status(400).json({ error: "userId ist erforderlich" });

    const range = clampRange(rangeQ);
    const { from, to } = calcFromTo(range, fromQ, toQ);

    console.log("📥 /api/trading/getStats", {
      userId, accountId, strategy, range,
      from: from?.toISOString(), to: to?.toISOString(),
      status, includeArchived,
    });

    // Basis-Match
    const match: any = {
      type: "tradeEntry",
      userId,
      deleted: { $ne: true },
    };

    // standardmäßig archivierte ausblenden
    const allowArchived = includeArchived === "true";
    if (!allowArchived) match.archived = { $ne: true };

    // Zusatzbedingungen via $and, damit sich $or-Bedingungen nicht überschreiben
    const andConds: any[] = [];
    if (accountId) andConds.push({ accountId });
    if (strategy) andConds.push({ $or: [{ strategy }, { strategy_name: strategy }] });

    // Statusfilter (wie in getByDate)
    if (status === "draft") {
      andConds.push({ $or: [{ status: "draft" }, { completed: { $ne: true } }] });
    } else if (status === "final") {
      andConds.push({ $or: [{ status: "final" }, { completed: true }] });
    }
    if (andConds.length) match.$and = andConds;

    const pipeline: any[] = [
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
          _rating: {
            $cond: [
              { $gt: [{ $type: "$rating" }, "missing"] },
              { $toDouble: "$rating" },
              null,
            ],
          },
        },
      },
    ];

    // Datumsfilter via _dateStr
    if (from || to) {
      const cond: any = {};
      if (from) cond.$gte = iso10(from);
      if (to) cond.$lte = iso10(to);
      pipeline.push({ $match: { _dateStr: cond } });
    }

    // Facettierte Aggregation: Resultverteilung, Averages, Tagesverlauf
    const [agg] = await col
      .aggregate([
        ...pipeline,
        {
          $facet: {
            results: [
              { $group: { _id: "$result", c: { $sum: 1 } } },
            ],
            avgs: [
              {
                $group: {
                  _id: null,
                  avgPnl: { $avg: "$_pnl" },
                  avgRating: {
                    $avg: {
                      $cond: [{ $ne: ["$_rating", null] }, "$_rating", null],
                    },
                  },
                  count: { $sum: 1 },
                },
              },
            ],
            daily: [
              { $group: { _id: "$_dateStr", count: { $sum: 1 }, pnl: { $sum: "$_pnl" } } },
              { $sort: { _id: 1 } },
              { $project: { _id: 0, day: "$_id", count: 1, pnl: 1 } },
            ],
          },
        },
      ])
      .toArray();

    // Resultverteilung auslesen
    const resultCounts = new Map<string, number>();
    for (const r of agg?.results ?? []) {
      resultCounts.set(String(r._id || ""), Number(r.c || 0));
    }
    const wins = resultCounts.get("win") ?? 0;
    const losses = resultCounts.get("loss") ?? 0;
    const bes = resultCounts.get("BE") ?? 0;
    const total = (agg?.avgs?.[0]?.count as number) ?? wins + losses + bes;

    // Winrate: wins / (wins + losses), BE ignorieren
    const denom = wins + losses;
    const winrate = denom > 0 ? wins / denom : 0;

    const avgPnl = Number.isFinite(agg?.avgs?.[0]?.avgPnl) ? Number(agg.avgs[0].avgPnl) : 0;
    const avgRating = Number.isFinite(agg?.avgs?.[0]?.avgRating) ? Number(agg.avgs[0].avgRating) : 0;

    // History ggf. fehlende Tage auffüllen
    let history: { day: string; count: number; pnl: number }[] = (agg?.daily ?? []).map((d: any) => ({
      day: String(d.day),
      count: Number(d.count || 0),
      pnl: Number(d.pnl || 0),
    }));

    if ((range === "week" || range === "month") || from || to) {
      const start = from ? new Date(from) : (history.length ? new Date(history[0].day + "T00:00:00Z") : undefined);
      const end = to ? new Date(to) : (history.length ? new Date(history[history.length - 1].day + "T00:00:00Z") : new Date());
      if (start && end) {
        const map = new Map(history.map(h => [h.day, h]));
        const filled: typeof history = [];
        for (let d = new Date(start); d <= end; d = addDays(d, 1)) {
          const k = iso10(d);
          filled.push(map.get(k) ?? { day: k, count: 0, pnl: 0 });
        }
        history = filled;
      }
    }

    return res.status(200).json({
      count: total,
      winrate,    // 0..1, BE ignoriert
      avgPnl,     // Zahl
      avgRating,  // Zahl
      history,    // [{ day: 'YYYY-MM-DD', count, pnl }]
    });
  } catch (err: any) {
    console.error("❌ Fehler in /api/trading/getStats:", err);
    return res.status(500).json({ error: err?.message ?? "Internal Server Error" });
  }
}
