import { NextApiRequest, NextApiResponse } from "next";
import { connectToDatabase } from "../db/mongo";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ message: "Method not allowed" });

  const { range = "week", userId } = req.query;
  if (!userId || typeof userId !== "string") {
    return res.status(400).json({ message: "Missing userId" });
  }

  const days = range === "month" ? 30 : 7;
  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - days);

  try {
    const { db } = await connectToDatabase();
    const appData = db.collection("trading");

    const trades = await appData
      .find({ type: "tradeEntry", userId, date: { $gte: fromDate.toISOString().slice(0,10) } })
      .toArray();

    const count = trades.length;
    const wins = trades.filter(t => t.result === "win").length;
    const winrate = count ? wins / count : 0;
    const avgPnl = count ? trades.reduce((s:any, t:any)=>s + (t.pnl||0),0)/count : 0;
    const avgRating = count ? trades.reduce((s:any,t:any)=>s+(t.rating||0),0)/count : 0;

    return res.status(200).json({ count, winrate, avgPnl, avgRating });
  } catch (err) {
    console.error("get stats error", err);
    return res.status(500).json({ message: "server error" });
  }
}