// pages/api/trading/createAccount.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { connectToDatabase } from "../db/mongo";
import { getTradingCollection } from "../db/mongo";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { db } = await connectToDatabase();
    const col = await getTradingCollection(db);

    const b = req.body ?? {};
    const userId = String(b.userId || "").trim();
    const name   = String(b.name || "").trim();
    if (!userId) return res.status(400).json({ error: "userId ist erforderlich" });
    if (!name)   return res.status(400).json({ error: "name ist erforderlich" });

    const doc = {
      type: "account" as const,
      userId,
      name,
      broker: b.broker ? String(b.broker) : undefined,
      currency: b.currency ? String(b.currency) : "USD",
      startingBalance: Number.isFinite(Number(b.startingBalance)) ? Number(b.startingBalance) : undefined,
      riskPerTrade:    Number.isFinite(Number(b.riskPerTrade))    ? Number(b.riskPerTrade)    : undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      archived: false,
      deleted: false,
    };

    const r = await col.insertOne(doc);
    return res.status(200).json({ ok: true, account: { ...doc, _id: String(r.insertedId) } });
  } catch (err: any) {
    console.error("❌ /api/trading/createAccount:", err);
    return res.status(500).json({ error: err?.message ?? "Internal Server Error" });
  }
}
