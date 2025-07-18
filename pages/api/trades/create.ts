import { NextApiRequest, NextApiResponse } from "next";
import { connectToDatabase } from "../db/mongo";
import { TradeEntry } from "@/utils/interface";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ message: "Method not allowed" });

  const trade = req.body as TradeEntry;

  if (!trade.userId || !trade.date || !trade.symbol) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  try {
    const { db } = await connectToDatabase();
    const appData = db.collection("trading");

    // Remove _id if present to avoid type conflict with MongoDB's ObjectId
    const { _id, ...tradeWithoutId } = trade;
    const result = await appData.insertOne({
      ...tradeWithoutId,
      type: "tradeEntry",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    return res.status(201).json({ id: result.insertedId });
  } catch (err) {
    console.error("create trade error", err);
    return res.status(500).json({ message: "server error" });
  }
}