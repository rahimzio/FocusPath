import { NextApiRequest, NextApiResponse } from "next";
import { connectToDatabase } from "../../db/mongo";
import { TradeEntry } from "@/utils/interface";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const { userId } = req.query;
  if (!userId || typeof userId !== "string") {
    return res.status(400).json({ message: "Missing userId" });
  }

  const { db } = await connectToDatabase();
  const collection = db.collection<TradeEntry>("trading");

  const data = await collection
    .aggregate([
      { $match: { userId, type: "tradeEntry" } },
      {
        $project: {
          month: { $substr: ["$date", 0, 7] },
          pnl: "$pnl",
          rr: { $cond: [{ $gt: ["$stopLoss", 0] }, { $divide: [{ $subtract: ["$exit", "$entry"] }, { $abs: { $subtract: ["$entry", "$stopLoss"] } }] }, 0] },
        },
      },
      {
        $group: {
          _id: "$month",
          pnl: { $sum: "$pnl" },
          rr: { $avg: "$rr" },
        },
      },
      { $sort: { _id: 1 } },
    ])
    .toArray();

  let cumulative = 0;
  let maxDrawdown = 0;
  let peak = 0;
  const months = data.map((d) => {
    cumulative += d.pnl;
    peak = Math.max(peak, cumulative);
    const drawdown = cumulative - peak;
    maxDrawdown = Math.min(maxDrawdown, drawdown);
    return { month: d._id, pnl: d.pnl, cumulative };
  });

  const avgRiskReward = data.length ? data.reduce((s, d) => s + (d.rr || 0), 0) / data.length : 0;

  return res.status(200).json({ months, maxDrawdown, avgRiskReward });
}