// pages/api/trading/trades/by-setup.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { ObjectId } from "mongodb";
import { connectToDatabase } from "@/pages/api/db/mongo";
import { TradeEntry } from "@/components/trading1/interface";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed. Use GET." });
  }

  try {
    const { userId, setupId } = req.query;

    if (!userId || typeof userId !== "string") {
      return res.status(400).json({ message: "Missing or invalid userId." });
    }

    if (!setupId || typeof setupId !== "string") {
      return res.status(400).json({ message: "Missing or invalid setupId." });
    }

    const { db } = await connectToDatabase();
    const appData = db.collection("trading");

    // Wir speichern setupId als String; falls du irgendwann ObjectId speicherst,
    // kannst du hier zusätzlich noch nach { setupId: new ObjectId(setupId) } suchen.
    const mongoQuery = {
      userId,
      type: "trading_trade_v1",
      setupId,
    };

    const docs = await appData
      .find(mongoQuery)
      .sort({ date: -1, createdAt: -1 })
      .toArray();

    const trades: TradeEntry[] = docs.map((doc: any) => {
      const { _id, type, ...rest } = doc;
      return {
        ...rest,
        _id: _id.toString(),
      } as TradeEntry;
    });

    return res.status(200).json({ trades });
  } catch (err) {
    console.error("Error in /api/trading/trades/by-setup", err);
    return res.status(500).json({ message: "Internal server error" });
  }
}
