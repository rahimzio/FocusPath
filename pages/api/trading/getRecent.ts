// Datei: pages/api/trading/getRecent.ts
import { NextApiRequest, NextApiResponse } from "next";
import { connectToDatabase } from "../db/mongo";
import { TradeEntry } from "@/utils/interface";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const { userId } = req.query;

  if (!userId || typeof userId !== "string") {
    return res.status(400).json({ message: "Missing or invalid userId" });
  }

  try {
    const { db } = await connectToDatabase();
    const trades = await db
      .collection<TradeEntry>("trading")
      .find({ userId, type: "tradeEntry" })
      .sort({ date: -1 }) // Neueste zuerst
      .limit(7)
      .toArray();

    return res.status(200).json({ trades });
  } catch (err) {
    console.error("❌ Fehler beim Laden der letzten Trades:", err);
    return res.status(500).json({ message: "Server error" });
  }
}
