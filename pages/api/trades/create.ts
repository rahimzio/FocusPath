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
const lastTrade = await appData
      .find({ userId: trade.userId, type: "tradeEntry" })
      .sort({ createdAt: -1 })
      .limit(1)
      .next();
    let tiltDetected = trade.tiltDetected || false;
    if (
      trade.pnl !== undefined &&
      trade.pnl < -300 &&
      lastTrade &&
      lastTrade.createdAt &&
      Date.now() - new Date(lastTrade.createdAt).getTime() < 30 * 60 * 1000
    ) {
      tiltDetected = true;
    }

    // Remove _id if present to avoid type conflict with MongoDB's ObjectId
    const { _id, ...tradeWithoutId } = trade;

    const tradeSummaryText =
      trade.tradeSummaryText ||
      `${trade.symbol} ${trade.setup} ${trade.result} PnL:${trade.pnl}`;
    const embeddingSourceText = `\n  ${trade.symbol} ${trade.setup} Entry: ${trade.entry}, Exit: ${trade.exit}, Result: ${trade.result}.\n  Notes: ${trade.notes || ""}. Reflection: ${trade.reflectionNotes || ""}.\n  Tags: ${trade.tags?.join(", ") || ""}. Violations: ${trade.ruleViolations?.join(", ") || ""}. Emotions: ${trade.emotions || ""}.\n`.trim();

    const result = await appData.insertOne({
      ...tradeWithoutId,
      tradeSummaryText,
      embeddingSourceText,
      type: "tradeEntry",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tiltDetected,
    });

    return res.status(201).json({ id: result.insertedId });
  } catch (err) {
    console.error("create trade error", err);
    return res.status(500).json({ message: "server error" });
  }
}