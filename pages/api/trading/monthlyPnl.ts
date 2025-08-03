// Datei: pages/api/trading/monthlyPnl.ts
import { NextApiRequest, NextApiResponse } from "next";
import { connectToDatabase } from "../db/connectToDatabase";
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { userId } = req.query;
  if (!userId || typeof userId !== "string") {
    return res.status(400).json({ error: "Missing or invalid userId" });
  }

  try {
    const { db } = await connectToDatabase();
    const tradesCol = db.collection("trading");

    const trades = await tradesCol
      .find({ userId })
      .sort({ date: 1 })
      .toArray();

    const result: { day: string; cumPnl: number }[] = [];
    let cumulative = 0;

    for (const t of trades) {
      const date = t.date?.substring(0, 10);
      if (!date) continue;
      const pnl = t.pnl ?? 0;
      cumulative += pnl;

      const existing = result.find((r) => r.day === date);
      if (existing) {
        existing.cumPnl += pnl;
      } else {
        result.push({ day: date, cumPnl: cumulative });
      }
    }

    return res.status(200).json(result);
  } catch (err) {
    console.error("/api/trading/monthlyPnl error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
