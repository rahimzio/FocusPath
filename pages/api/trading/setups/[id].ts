// pages/api/trading/trades/[id].ts
import type { NextApiRequest, NextApiResponse } from "next";
import { ObjectId } from "mongodb";
import { connectToDatabase } from "@/pages/api/db/mongo";
import { TradeEntry } from "../../../../components/trading1/interface";
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { id } = req.query;

  if (!id || typeof id !== "string") {
    return res.status(400).json({ message: "Invalid id" });
  }

  if (req.method !== "PUT") {
    return res
      .status(405)
      .json({ message: "Method not allowed. Use PUT." });
  }

  try {
    const { db } = await connectToDatabase();
    const appData = db.collection("appData");

    const body = req.body;

    const {
      userId,
      date,
      symbol,
      setup,
      setupId,
      entry,
      exit,
      stopLoss,
      positionSize,
      result,
      pnl,
      rating,
      screenshotUrl,
      notes,
      tags,
      gameGrade,
      thoughts,
    } = body;

    if (!userId || !date || !symbol || entry == null || exit == null) {
      return res.status(400).json({ message: "Missing required fields." });
    }

    const now = new Date().toISOString();

    const updateDoc: Partial<TradeEntry> & { updatedAt: string } = {
      userId,
      date,
      symbol,
      setup,
      setupId,
      entry,
      exit,
      stopLoss,
      positionSize,
      result,
      pnl,
      rating,
      screenshotUrl,
      notes,
      tags,
      gameGrade,
      thoughts,
      updatedAt: now,
    };

    const resultDb = await appData.findOneAndUpdate(
      { _id: new ObjectId(id), type: "trade_entry_v2" },
      { $set: updateDoc },
      { returnDocument: "after" }
    );

    if (!resultDb.value) {
      return res.status(404).json({ message: "Trade not found" });
    }

    const { _id, type, ...rest } = resultDb.value as any;

    const tradeToReturn: TradeEntry = {
      ...rest,
      _id: _id.toString(),
    };

    return res.status(200).json({ trade: tradeToReturn });
  } catch (err) {
    console.error("Error updating trade", err);
    return res.status(500).json({ message: "Internal server error" });
  }
}
