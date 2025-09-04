// pages/api/trading/mentalStats.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { connectToDatabase } from "../db/mongo";

/* Helpers */
type RangeKey = "week" | "month" | "all";
const clampRange = (v?: string): RangeKey => (v === "week" || v === "all" ? v : "month");
const toDate10 = (s?: string | null) => (s ? String(s).slice(0, 10) : undefined);
const iso10 = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (d: Date, n: number) => {
  const x = new Date(d);
  x.setUTCDate(x.getUTCDate() + n);
  return x;
};
function calcFromTo(range: RangeKey, fromQ?: string | null, toQ?: string | null) {
  const today = new Date();
  const to = toQ ? new Date(toDate10(toQ)! + "T23:59:59.999Z") : today;
  if (fromQ) return { from: new Date(toDate10(fromQ)! + "T00:00:00.000Z"), to };
  if (range === "all") return { from: undefined as Date | undefined, to };
  const d = new Date(to);
  if (range === "week") d.setUTCDate(d.getUTCDate() - 6); // 7 Tage inkl. heute
  else d.setUTCDate(d.getUTCDate() - 29);                 // 30 Tage inkl. heute
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
        col.createIndex({ userId: 1, session: 1, date: 1 }),
        col.createIndex({ userId: 1, "outcomeFlags.breakEven": 1 }),
        col.createIndex({ userId: 1, "outcomeFlags.stopHit": 1 }),
        col.createIndex({ userId: 1, result: 1 }),
        col.createIndex({ userId: 1, archived: 1, deleted: 1 }),
        col.createIndex({ userId: 1, strategy: 1 }),
        col.createIndex({ userId: 1, strategy_name: 1 }),
      ]);
    } catch {}

    const {
      userId,
      accountId,
      strategy,
      from: fromQ,
      to: toQ,
      range: rangeQ,
      onlyFinal,          // legacy alias für status=final
      status,             // 'draft' | 'final' | 'all'
      includeArchived,    // 'true' | 'false' (default: false)
      minCount: minCountRaw,
      limit: limitRaw,
    } = req.query as Record<string, string | undefined>;

    if (!userId) return res.status(400).json({ error: "userId ist erforderlich" });

    const range = clampRange(rangeQ);
    const { from, to } = calcFromTo(range, fromQ, toQ);
    const minCount = Math.max(Number(minCountRaw ?? 1), 1);
    const limit = Math.min(Math.max(Number(limitRaw ?? 100), 1), 500);

    console.log("📥 /api/trading/mentalStats", {
      userId,
      accountId,
      strategy,
      range,
      from: from ? iso10(from) : undefined,
      to: to ? iso10(to) : undefined,
      status,
      onlyFinal,
      includeArchived,
      minCount,
      limit,
    });

    // Basisfilter
    const match: any = {
      type: "tradeEntry",
      userId,
      deleted: { $ne: true },
    };

    // standardmäßig archivierte ausblenden
    const allowArchived = includeArchived === "true";
    if (!allowArchived) match.archived = { $ne: true };

    // Zusatzbedingungen via $and (damit $or-Bedingungen separat bleiben)
    const andConds: any[] = [];
    if (accountId) andConds.push({ accountId });
    if (strategy) andConds.push({ $or: [{ strategy }, { strategy_name: strategy }] });

    // Statusfilter (inkl. legacy onlyFinal)
    const effStatus = status && ["draft", "final", "all"].includes(status) ? status : (onlyFinal === "true" ? "final" : "all");
    if (effStatus === "draft") {
      andConds.push({ $or: [{ status: "draft" }, { completed: { $ne: true } }] });
    } else if (effStatus === "final") {
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
          _mistakes: {
            $cond: [
              { $isArray: "$tradingMistakes" },
              "$tradingMistakes",
              {
                $cond: [
                  { $and: [{ $ne: ["$mentalMistake", null] }, { $ne: ["$mentalMistake", ""] }] },
                  ["$mentalMistake"],
                  [],
                ],
              },
            ],
          },
          _emotion: {
            $cond: [
              { $and: [{ $ne: ["$emotionBefore", null] }, { $ne: ["$emotionBefore", ""] }] },
              "$emotionBefore",
              null,
            ],
          },
          _bias: {
            $cond: [
              { $and: [{ $ne: ["$biasExecution", null] }, { $ne: ["$biasExecution", ""] }] },
              "$biasExecution",
              null,
            ],
          },
          _session: {
            $cond: [
              { $and: [{ $ne: ["$session", null] }, { $ne: ["$session", ""] }] },
              "$session",
              null,
            ],
          },
          _isBE: { $toBool: { $ifNull: ["$outcomeFlags.breakEven", false] } },
          _isStop: { $toBool: { $ifNull: ["$outcomeFlags.stopHit", false] } },
        },
      },
    ];

    // Datumsfilter
    if (from || to) {
      const cond: any = {};
      if (from) cond.$gte = iso10(from);
      if (to) cond.$lte = iso10(to);
      pipeline.push({ $match: { _dateStr: cond } });
    }

    // Aggregation als Facet
    const [agg] = await col.aggregate([
      ...pipeline,
      {
        $facet: {
          base: [
            {
              $group: {
                _id: null,
                trades: { $sum: 1 },
                withMistakes: {
                  $sum: { $cond: [{ $gt: [{ $size: "$_mistakes" }, 0] }, 1, 0] },
                },
                mistakesTotal: { $sum: { $size: "$_mistakes" } },
                beCount: { $sum: { $cond: ["$_isBE", 1, 0] } },
                stopHitCount: { $sum: { $cond: ["$_isStop", 1, 0] } },
              },
            },
          ],
          mistakes: [
            { $unwind: { path: "$_mistakes", preserveNullAndEmptyArrays: false } },
            { $addFields: { _m_raw: { $toString: "$_mistakes" } } },
            {
              $addFields: {
                _m_trim: { $trim: { input: "$_m_raw" } },
                _m_norm: { $toLower: { $trim: { input: "$_m_raw" } } },
              },
            },
            { $match: { _m_trim: { $ne: "" } } },
            { $group: { _id: "$_m_norm", label: { $first: "$_m_trim" }, count: { $sum: 1 } } },
            { $match: { count: { $gte: minCount } } },
            { $sort: { count: -1, label: 1 } },
            { $limit: limit },
            { $project: { _id: 0, label: 1, count: 1 } },
          ],
          mistakesByResult: [
            { $unwind: { path: "$_mistakes", preserveNullAndEmptyArrays: false } },
            { $group: { _id: { mistake: "$_mistakes", result: "$result" }, count: { $sum: 1 } } },
            { $project: { _id: 0, mistake: "$_id.mistake", result: "$_id.result", count: 1 } },
            { $sort: { mistake: 1, result: 1 } },
          ],
          emotions: [
            { $match: { _emotion: { $ne: null } } },
            { $group: { _id: "$_emotion", count: { $sum: 1 } } },
            { $project: { _id: 0, label: "$_id", count: 1 } },
            { $sort: { count: -1, label: 1 } },
          ],
          bias: [
            { $match: { _bias: { $ne: null } } },
            { $group: { _id: "$_bias", count: { $sum: 1 } } },
            { $project: { _id: 0, label: "$_id", count: 1 } },
            { $sort: { label: 1 } },
          ],
          sessions: [
            { $match: { _session: { $ne: null } } },
            { $group: { _id: "$_session", count: { $sum: 1 } } },
            { $project: { _id: 0, label: "$_id", count: 1 } },
            { $sort: { label: 1 } },
          ],
          daily: [
            {
              $group: {
                _id: "$_dateStr",
                trades: { $sum: 1 },
                mistakes: { $sum: { $size: "$_mistakes" } },
              },
            },
            { $sort: { _id: 1 } },
            { $project: { _id: 0, day: "$_id", trades: 1, mistakes: 1 } },
          ],
        },
      },
    ]).toArray();

    const base = agg?.base?.[0] ?? {};

    // History aufbereiten + ggf. Lücken füllen
    let history: { day: string; trades: number; mistakes: number }[] =
      (agg?.daily ?? []).map((d: any) => ({
        day: String(d.day),
        trades: Number(d.trades || 0),
        mistakes: Number(d.mistakes || 0),
      }));

    if ((range === "week" || range === "month") || from || to) {
      const start = from ? new Date(from) : (history.length ? new Date(history[0].day + "T00:00:00Z") : undefined);
      const end   = to   ? new Date(to)   : (history.length ? new Date(history[history.length - 1].day + "T00:00:00Z") : new Date());
      if (start && end) {
        const map = new Map(history.map(h => [h.day, h]));
        const filled: typeof history = [];
        for (let d = new Date(start); d <= end; d = addDays(d, 1)) {
          const k = iso10(d);
          filled.push(map.get(k) ?? { day: k, trades: 0, mistakes: 0 });
        }
        history = filled;
      }
    }

    const counts = {
      mistakes: (agg?.mistakes ?? []).map((x: any) => ({ label: String(x.label), count: Number(x.count || 0) })),
      mistakesByResult: (agg?.mistakesByResult ?? []).map((x: any) => ({
        mistake: String(x.mistake),
        result: String(x.result ?? ""),
        count: Number(x.count || 0),
      })),
      emotions: (agg?.emotions ?? []).map((x: any) => ({ label: String(x.label), count: Number(x.count || 0) })),
      biasExecution: (agg?.bias ?? []).map((x: any) => ({ label: String(x.label), count: Number(x.count || 0) })),
      sessions: (agg?.sessions ?? []).map((x: any) => ({ label: String(x.label), count: Number(x.count || 0) })),
    };

    // Rückwärtskompatible Felder
    const totalMistakes = Number(base.mistakesTotal ?? 0);

    return res.status(200).json({
      totals: {
        trades: Number(base.trades ?? 0),
        withMistakes: Number(base.withMistakes ?? 0),
        mistakesTotal: totalMistakes,
        beCount: Number(base.beCount ?? 0),
        stopHitCount: Number(base.stopHitCount ?? 0),
      },
      counts,
      history,                 // [{ day, trades, mistakes }]
      // Legacy/Kompatibilität:
      total: totalMistakes,
      mistakes: counts.mistakes,
    });
  } catch (err: any) {
    console.error("❌ Fehler in /api/trading/mentalStats:", err);
    return res.status(500).json({ error: err?.message ?? "Internal Server Error" });
  }
}
