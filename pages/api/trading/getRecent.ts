// pages/api/trading/getRecent.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { ObjectId } from "mongodb";
import { connectToDatabase } from "../db/mongo";
import { getTradingCollection } from "../db/mongo";

const toNum = (v: any, def?: number) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : def ?? undefined;
};
const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { db } = await connectToDatabase();
    const col = await getTradingCollection(db);

    // Indizes (idempotent)
    try {
      await Promise.all([
        col.createIndex({ type: 1, userId: 1, _id: -1 }),
        col.createIndex({ type: 1, userId: 1, date: -1, _id: -1 }),
        col.createIndex({ type: 1, userId: 1, accountId: 1, _id: -1 }),
        col.createIndex({ type: 1, userId: 1, strategy: 1, _id: -1 }),
        col.createIndex({ type: 1, userId: 1, strategy_name: 1, _id: -1 }),
        col.createIndex({ type: 1, userId: 1, archived: 1, deleted: 1 }),
      ]);
    } catch { }

    const {
      userId, accountId, strategy, from, to,
      cursor, limit: limitRaw, status, includeArchived,
    } = req.query as Record<string, string | undefined>;

    if (!userId) return res.status(400).json({ error: "userId ist erforderlich" });

    const limit = clamp(Number(limitRaw ?? 100) || 100, 1, 500);

    const match: any = { type: "tradeEntry", userId };
    const allowArchived = includeArchived === "true";
    if (!allowArchived) match.archived = { $ne: true };
    match.deleted = { $ne: true };

    if (accountId) match.accountId = accountId;
    if (strategy) match.$or = [{ strategy }, { strategy_name: strategy }];

    if (from || to) {
      match.date = {};
      if (from) match.date.$gte = String(from).slice(0, 10);
      if (to) match.date.$lte = String(to).slice(0, 10);
    }

    if (status === "draft") {
      match.$or = [...(match.$or ?? []), { status: "draft" }, { completed: { $ne: true } }];
    } else if (status === "final") {
      match.$or = [...(match.$or ?? []), { status: "final" }, { completed: true }];
    }

    if (cursor) {
      try { match._id = { ...(match._id || {}), $lt: new ObjectId(String(cursor)) }; } catch { }
    }

    const docs = await col.find(match).sort({ _id: -1 }).limit(limit + 1).toArray();

    let nextCursor: string | null = null;
    let pageDocs = docs;
    if (docs.length > limit) {
      pageDocs = docs.slice(0, limit);
      nextCursor = String(pageDocs[pageDocs.length - 1]._id);
    }

    const trades = pageDocs.map((d: any) => ({
      _id: String(d._id),
      userId: d.userId,
      date: String(d.date ?? "").slice(0, 10),
      symbol: d.symbol ?? "",
      accountId: d.accountId ?? undefined,
      entry: Number.isFinite(Number(d.entry)) ? Number(d.entry) : undefined,
      pnl: Number.isFinite(Number(d.pnl)) ? Number(d.pnl) : undefined,
      lotSize: Number.isFinite(Number(d.lotSize)) ? Number(d.lotSize) : undefined,
      potentialLoss: Number.isFinite(Number(d.potentialLoss)) ? Number(d.potentialLoss) : undefined,
      rating: Number.isFinite(Number(d.rating)) ? Number(d.rating) : undefined,
      result: d.result ?? "BE",
      tradeType: d.tradeType === "sell" ? "sell" : "buy",
      strategy: d.strategy ?? d.strategy_name ?? undefined,
      strategy_name: d.strategy_name ?? d.strategy ?? undefined,
      notes: d.notes ?? "",
      startTime: d.startTime ?? undefined,
      endTime: d.endTime ?? undefined,
      durationMin: Number.isFinite(Number(d.durationMin)) ? Number(d.durationMin) : undefined,
      riskReward: typeof d.riskReward === "string" && d.riskReward.trim() ? d.riskReward.trim() : undefined,
      session: d.session ?? undefined,
      confluences: Array.isArray(d.confluences) ? d.confluences.map(String) : [],
      outcomeFlags: {
        breakEven: !!(d.outcomeFlags?.breakEven),
        stopHit: !!(d.outcomeFlags?.stopHit),
      },
      biasExecution: d.biasExecution ?? undefined,
      tradingMistakes: Array.isArray(d.tradingMistakes) ? d.tradingMistakes : [],
      rangeDefined: !!d.rangeDefined,
      rangeNote: d.rangeNote ?? "",
      viewTimeframes: Array.isArray(d.viewTimeframes) ? d.viewTimeframes : [],
      entryTimeframe: d.entryTimeframe ?? "",
      concepts: Array.isArray(d.concepts) ? d.concepts : [],
      location: d.location ?? "",
      gameComputed: d.gameComputed ?? undefined,
      gameSelf: d.gameSelf ?? undefined,
      gameItems: Array.isArray(d.gameItems) ? d.gameItems.map(String) : [],
      gameCatalogScore: toNum(d.gameCatalogScore, 0) ?? 0,
      gameCatalogGrade: d.gameCatalogGrade ?? undefined,
      stopPrice: Number.isFinite(Number(d.stopPrice)) ? Number(d.stopPrice) : undefined,
      targetPrice: Number.isFinite(Number(d.targetPrice)) ? Number(d.targetPrice) : undefined,
      status: d.status ?? (d.completed ? "final" : "draft"),
      completed: !!d.completed,
      missing: Array.isArray(d.missing) ? d.missing : [],
      createdAt: d.createdAt ?? undefined,
      updatedAt: d.updatedAt ?? undefined,
    }));

    return res.status(200).json({ trades, nextCursor });
  } catch (err: any) {
    console.error("❌ Fehler in /api/trading/getRecent:", err);
    return res.status(500).json({ error: err?.message ?? "Internal Server Error" });
  }
}
