// pages/api/trading/getById.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { ObjectId } from "mongodb";
import { connectToDatabase } from "../db/mongo";

/* helpers */
const toNum = (v: any, def?: number) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : def ?? undefined;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ message: "Method not allowed" });

  const { id, userId, includeArchived } = req.query as {
    id?: string;
    userId?: string;
    includeArchived?: string;
  };

  if (!id || typeof id !== "string") return res.status(400).json({ message: "Missing id" });
  if (!userId || typeof userId !== "string") return res.status(400).json({ message: "Missing userId" });

  let _id: ObjectId;
  try {
    _id = new ObjectId(id);
  } catch {
    return res.status(400).json({ message: "Invalid id" });
  }

  try {
    const { db } = await connectToDatabase();
    const col = db.collection("trading");

    // Indizes (idempotent; schaden nicht, helfen späteren Queries)
    try {
      await Promise.all([
        col.createIndex({ userId: 1, type: 1, _id: -1 }),
        col.createIndex({ userId: 1, archived: 1, deleted: 1 }),
      ]);
    } catch {}

    // Toleranter type-Guard + archived/deleted standardmäßig ausschließen
    const match: any = {
      _id,
      userId,
      deleted: { $ne: true },
      $and: [{ $or: [{ type: "tradeEntry" }, { type: "trade" }, { type: { $exists: false } }] }],
    };
    if (includeArchived !== "true") match.archived = { $ne: true };

    const doc = await col.findOne(match);
    if (!doc) return res.status(404).json({ message: "Trade not found" });

    // Map auf konsistentes DTO (kein result-Default; Status sauber abgeleitet)
    const rawResult = typeof (doc as any).result === "string" ? (doc as any).result : undefined;
    const mappedStatus =
      typeof (doc as any).status === "string"
        ? (doc as any).status
        : ((doc as any).completed ? "final" : (rawResult ? "final" : "draft"));

    const trade = {
      _id: String((doc as any)._id),
      userId: (doc as any).userId,
      type: (doc as any).type,

      date: typeof (doc as any).date === "string" ? (doc as any).date.slice(0, 10) : undefined,
      symbol: (doc as any).symbol ?? "",

      accountId: (doc as any).accountId ?? undefined,
      tradeType: (doc as any).tradeType === "sell" ? "sell" : "buy",

      entry: toNum((doc as any).entry),
      exit: toNum((doc as any).exit),
      pnl: toNum((doc as any).pnl, 0),
      lotSize: toNum((doc as any).lotSize),
      potentialLoss: toNum((doc as any).potentialLoss),
      rating: toNum((doc as any).rating),

      result: rawResult, // ❗ keine Defaults mehr (Drafts bleiben undefined/null im UI)
      notes: (doc as any).notes ?? "",

      startTime: (doc as any).startTime ?? undefined,
      endTime: (doc as any).endTime ?? undefined,
      durationMin: toNum((doc as any).durationMin, 0),
      session: (doc as any).session ?? undefined,

      outcomeFlags: {
        breakEven: !!(doc as any)?.outcomeFlags?.breakEven,
        stopHit: !!(doc as any)?.outcomeFlags?.stopHit,
      },
      biasExecution: (doc as any).biasExecution ?? undefined,

      strategy: (doc as any).strategy ?? (doc as any).strategy_name ?? undefined,
      strategy_name: (doc as any).strategy_name ?? (doc as any).strategy ?? undefined,
      riskReward:
        typeof (doc as any).riskReward === "string" && (doc as any).riskReward.trim()
          ? (doc as any).riskReward.trim()
          : undefined,

      tradingMistakes: Array.isArray((doc as any).tradingMistakes) ? (doc as any).tradingMistakes : [],
      confluences: Array.isArray((doc as any).confluences) ? (doc as any).confluences.map(String) : [],
      viewTimeframes: Array.isArray((doc as any).viewTimeframes) ? (doc as any).viewTimeframes : [],
      entryTimeframe: (doc as any).entryTimeframe ?? "",
      concepts: Array.isArray((doc as any).concepts) ? (doc as any).concepts : [],
      rangeDefined: !!(doc as any).rangeDefined,
      rangeNote: (doc as any).rangeNote ?? "",
      location: (doc as any).location ?? "",

      gameComputed: (doc as any).gameComputed ?? undefined,
      gameSelf: (doc as any).gameSelf ?? undefined,
      gameItems: Array.isArray((doc as any).gameItems) ? (doc as any).gameItems.map(String) : [],
      gameCatalogScore: toNum((doc as any).gameCatalogScore, 0) ?? 0,
      gameCatalogGrade: (doc as any).gameCatalogGrade ?? undefined,

      stopPrice: toNum((doc as any).stopPrice),
      targetPrice: toNum((doc as any).targetPrice),

      status: mappedStatus,
      completed: mappedStatus === "final",
      missing: Array.isArray((doc as any).missing) ? (doc as any).missing : [],

      createdAt: (doc as any).createdAt ?? undefined,
      updatedAt: (doc as any).updatedAt ?? undefined,
    };

    return res.status(200).json({ trade });
  } catch (e) {
    console.error("getById error:", e);
    return res.status(500).json({ message: "Internal server error" });
  }
}
