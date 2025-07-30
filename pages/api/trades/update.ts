import { NextApiRequest, NextApiResponse } from "next";
import { connectToDatabase } from "../db/mongo";
import { ObjectId } from "mongodb";
import { TradeEntry } from "@/utils/interface";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "PUT") return res.status(405).json({ message: "Method not allowed" });

  const { id, userId } = req.query;
  if (!id || typeof id !== "string" || !userId || typeof userId !== "string") {
    return res.status(400).json({ message: "Missing id or userId" });
  }

  const trade = req.body as Partial<TradeEntry>;

  try {
    const { db } = await connectToDatabase();
    const collection = db.collection("trading");

    const { _id, ...updateData } = trade;
 const lastTrade = await collection
      .find({ userId, type: "tradeEntry" })
      .sort({ createdAt: -1 })
      .limit(1)
      .next();

    let tiltDetected = trade.tiltDetected;
    if (
      trade.pnl !== undefined &&
      trade.pnl < -300 &&
      lastTrade &&
      lastTrade._id.toString() !== id &&
      lastTrade.createdAt &&
      Date.now() - new Date(lastTrade.createdAt).getTime() < 30 * 60 * 1000
    ) {
      tiltDetected = true;
    }

    const result = await collection.updateOne(
      { _id: new ObjectId(id), userId, type: "tradeEntry" },
 { $set: { ...updateData, tiltDetected, updatedAt: new Date().toISOString() } }    );

    if (result.modifiedCount === 0) {
      return res.status(404).json({ message: "Trade not found or not updated" });
    }

    return res.status(200).json({ message: "Trade updated" });
  } catch (err) {
    console.error("update trade error", err);
    return res.status(500).json({ message: "server error" });
  }
}