import type { NextApiRequest, NextApiResponse } from "next";
import { connectToDatabase } from "../../db/connectToDatabase";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ message: "Method not allowed" });

  const { userId } = req.query;
  const accountId =
    typeof req.query.accountId === "string" && req.query.accountId.trim() !== "" ? req.query.accountId : undefined;
  const strategy =
    typeof req.query.strategy === "string" && req.query.strategy.trim() !== "" ? req.query.strategy : undefined;

  if (!userId || typeof userId !== "string") {
    return res.status(400).json({ message: "Missing userId" });
  }

  try {
    const { db } = await connectToDatabase();
    const match: any = { userId, type: "tradeEntry", tradingMistakes: { $exists: true, $ne: [] } };
    if (accountId) match.accountId = accountId;
    if (strategy) match.strategy_name = strategy;

    const pipeline = [
      { $match: match },
      { $unwind: "$tradingMistakes" },
      { $group: { _id: "$tradingMistakes", count: { $sum: 1 } } },
      { $project: { _id: 0, mistake_type: "$_id", count: 1 } },
      { $sort: { count: -1, mistake_type: 1 } },
    ] as any[];

    const data = await db.collection("trading").aggregate(pipeline).toArray();
    return res.status(200).json(data);
  } catch (e) {
    console.error("mistakes endpoint error:", e);
    return res.status(500).json({ message: "Internal server error" });
  }
}
