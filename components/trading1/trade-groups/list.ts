// pages/api/trading/trade-groups/list.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { connectToDatabase } from "@/pages/api/db/mongo";
import { TradeGroup } from "@/components/trading/interface";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res
      .status(405)
      .json({ message: "Method not allowed. Use GET." });
  }

  const { userId } = req.query;

  if (!userId || typeof userId !== "string") {
    return res.status(400).json({ message: "Missing or invalid userId" });
  }

  try {
    const { db } = await connectToDatabase();
    const appData = db.collection("appData");

    const docs = (await appData
      .find({ type: "trade_group_v2", userId })
      .sort({ createdAt: -1 })
      .toArray()) as any[];

    const groups: TradeGroup[] = docs.map((doc) => {
      const { _id, type, ...rest } = doc;
      return {
        ...rest,
        _id: _id.toString(),
      } as TradeGroup;
    });

    return res.status(200).json({ groups });
  } catch (err) {
    console.error("Error loading trade groups", err);
    return res.status(500).json({ message: "Internal server error" });
  }
}
