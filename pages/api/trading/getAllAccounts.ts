// pages/api/trading/getAllAccounts.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { connectToDatabase } from "../db/mongo";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  try {
    const userId = typeof req.query.userId === "string" ? req.query.userId : undefined;
    if (!userId) return res.status(400).json({ error: "userId ist erforderlich" });

    const { db } = await connectToDatabase();
    const col = db.collection("trading");

    // 🔧 WICHTIG für Cosmos (Mongo API):
    // Filter-Gleichheitsfelder (vorn) + Sort-Felder (hinten, mit Richtungen) exakt in einem Index.
    try {
      await Promise.all([
        // Standard-Sort: updatedAt desc, _id desc
        col.createIndex({ userId: 1, type: 1, archived: 1, deleted: 1, updatedAt: -1, _id: -1 }),
        // Alternativ-Sort nach name asc (falls du irgendwo sort({name:1}) nutzt)
        col.createIndex({ userId: 1, type: 1, archived: 1, deleted: 1, name: 1, _id: -1 }),
        // Schneller Lookup ohne Sort (als Fallback)
        col.createIndex({ userId: 1, type: 1, archived: 1, deleted: 1, _id: -1 }),
      ]);
    } catch {
      // Index-Erstellung ist idempotent; Fehler hier sind i. d. R. unkritisch
    }

    const baseFilter: any = {
      type: "account",
      userId,
      archived: { $ne: true },
      deleted: { $ne: true },
    };

    // Optional: ?sort=name|updatedAt  /  ?dir=asc|desc
    const sortKey = req.query.sort === "name" ? "name" : "updatedAt";
    const dir = String(req.query.dir || "desc").toLowerCase() === "asc" ? 1 : -1;
    const sort: any = sortKey === "name" ? { name: 1, _id: -1 } : { updatedAt: -1, _id: -1 };

    let docs: any[] = [];
    try {
      docs = await col.find(baseFilter).sort(sort).limit(500).toArray();
    } catch (e: any) {
      // Cosmos Composite-Index-Fehler → Fallback auf _id:-1
      const msg = String(e?.message || "");
      const isCosmosCompositeIdxError =
        e?.code === 2 || /composite index/i.test(msg) || /order by query/i.test(msg);
      if (!isCosmosCompositeIdxError) throw e;

      docs = await col.find(baseFilter).sort({ _id: -1 }).limit(500).toArray();
    }

    const accounts = docs.map((d) => ({
      _id: String(d._id),
      userId: d.userId,
      name: d.name ?? "",
      broker: d.broker ?? "",
      currency: d.currency ?? "",
      startingBalance: Number(d.startingBalance ?? 0),
      currentBalance: Number(d.currentBalance ?? 0),
      realizedPnl: Number(d.realizedPnl ?? 0),
      riskPerTrade: Number(d.riskPerTrade ?? 0),
      createdAt: d.createdAt,
      updatedAt: d.updatedAt,
    }));

    return res.status(200).json({ accounts });
  } catch (err: any) {
    console.error("getAllAccounts error:", err);
    return res.status(500).json({ error: err?.message ?? "Internal Server Error" });
  }
}
