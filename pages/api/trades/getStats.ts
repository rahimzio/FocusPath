import { NextApiRequest, NextApiResponse } from "next";
import { connectToDatabase } from "../db/mongo";
import { TradeEntry } from "@/utils/interface";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ message: "Method not allowed" });

  const { range = "week", userId, accountId } = req.query;
  if (!userId || typeof userId !== "string") {
    return res.status(400).json({ message: "Missing userId" });
  }

  const days = range === "month" ? 30 : 7;
  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - days);

  try {
    const { db } = await connectToDatabase();
    const appData = db.collection("trading");
const query: Record<string, unknown> & { accountId?: string } = {
      type: "tradeEntry",
      userId,
      date: { $gte: fromDate.toISOString().slice(0, 10) }
    };
    if (accountId && typeof accountId === "string") {
      query.accountId = accountId;
    }
    const trades = await appData
      .find<TradeEntry>(query)
      .toArray();

    const count = trades.length;
    const wins = trades.filter(t => t.result === "win").length;
    const winrate = count ? wins / count : 0;
    const avgPnl = count ? trades.reduce((s, t) => s + (t.pnl || 0), 0) / count : 0;
    const avgRating = count ? trades.reduce((s, t) => s + (t.rating || 0), 0) / count : 0;

    return res.status(200).json({ count, winrate, avgPnl, avgRating });
  } catch (err) {
    console.error("get stats error", err);
    return res.status(500).json({ message: "server error" });
  }
}