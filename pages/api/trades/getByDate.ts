import { NextApiRequest, NextApiResponse } from "next";
import { connectToDatabase } from "../db/mongo";
import { TradeEntry } from "@/utils/interface";
import { ObjectId } from "mongodb";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ message: "Method not allowed" });

  const { date, userId,accountId  } = req.query;

  if (!date || typeof date !== "string" || !userId || typeof userId !== "string") {
    return res.status(400).json({ message: "Missing parameters" });
  }

  try {
    const { db } = await connectToDatabase();
    const appData = db.collection("trading");
    const query: Record<string, unknown> & { accountId?: string } = { type: "tradeEntry", userId, date };
    if (accountId && typeof accountId === "string") {
      query.accountId = accountId;
    }
    const trades = await appData
      .find(query)
      .project({ type: 0 })
      .toArray() as TradeEntry[];

    return res.status(200).json({ trades });
  } catch (err) {
    console.error("get trades error", err);
    return res.status(500).json({ message: "server error" });
  }
}