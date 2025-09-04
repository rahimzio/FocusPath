// pages/api/trading/getAllAccounts.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { connectToDatabase } from "../db/mongo";

// Shape in der vereinheitlichten "trading"-Collection
type AccountDoc = {
  _id: any;
  type?: string;               // "account"
  userId: string;
  name?: string;
  broker?: string;
  currency?: string;
  startingBalance?: number;
  riskPerTrade?: number;       // in %
  createdAt?: string;
  updatedAt?: string;
  archived?: boolean;
  deleted?: boolean;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ message: "Method not allowed" });

  const { userId } = req.query;
  if (!userId || typeof userId !== "string") {
    return res.status(400).json({ message: "Missing userId" });
  }

  try {
    const { db } = await connectToDatabase();
    const col = db.collection<AccountDoc>("trading"); // ✅ vereinheitlicht

    // ✅ Indizes (idempotent). Erster Index deckt Filter + Sort(createdAt) ab.
    // Zweiter Index erlaubt schnelle Namenssuche/Sort nach name (ohne Composite-OrderBy).
    try {
      await Promise.all([
        col.createIndex({ userId: 1, type: 1, archived: 1, deleted: 1, createdAt: -1 }),
        col.createIndex({ userId: 1, type: 1, name: 1 }),
      ]);
    } catch {}

    const match: any = {
      userId,
      type: "account",
      archived: { $ne: true },
      deleted: { $ne: true },
    };

    // ❗️WICHTIG: Nur EIN Sort-Key benutzen, sonst verlangt Cosmos einen Composite-Index.
    // Wenn du wieder sekundär nach name sortieren willst, lies die Notiz unten.
    const docs = await col
      .find(match, {
        projection: {
          userId: 1,
          name: 1,
          broker: 1,
          currency: 1,
          startingBalance: 1,
          riskPerTrade: 1,
          createdAt: 1,
          updatedAt: 1,
        },
      })
      .sort({ createdAt: -1 }) // ← nur ein Feld, kompatibel mit obigem Index
      .toArray();

    const accounts = docs.map((d) => ({
      _id: String(d._id),
      name: d.name,
      broker: d.broker,
      currency: d.currency,
      startingBalance: typeof d.startingBalance === "number" ? d.startingBalance : undefined,
      riskPerTrade: typeof d.riskPerTrade === "number" ? d.riskPerTrade : undefined,
      createdAt: d.createdAt,
      updatedAt: d.updatedAt,
    }));

    return res.status(200).json({ accounts });
  } catch (err) {
    console.error("getAllAccounts error:", err);
    return res.status(500).json({ message: "server error" });
  }
}
