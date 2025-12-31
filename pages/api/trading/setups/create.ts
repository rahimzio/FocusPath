// pages/api/trading/setups/create.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { ObjectId } from "mongodb";
import { connectToDatabase } from "@/pages/api/db/mongo";
import { TradingSetup } from "../../../../components/trading1/interface";
type DbTradingSetup = Omit<TradingSetup, "_id"> & {
  _id: ObjectId;
  type: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res
      .status(405)
      .json({ message: "Method not allowed. Use POST." });
  }

  try {
    const body = req.body as Partial<TradingSetup> & {
      userId?: string;
    };

    const {
      userId,
      market,
      direction,
      htfTf,
      htfBias,
      entryTf,
      htfD1Bias,
      htfH4Bias,
      htfH1Bias,
      waitFor,
      chartImageUrl,
      setupLabel,
      patternType,
      keyLevels,
      structureNotes,
      plannedEntryMin,
      plannedEntryMax,
      plannedStop,
      plannedTarget,
      plannedRR,
      status,
      thoughtProcess,
      decision,
      outcome,
      gameGrade,
      reflection,
      entryChecklistTemplate,
      entryChecklistState,
      linkedTradeId,
      resolvedAt,
    } = body;

    // 🔎 Minimal-Validation: das muss da sein
    if (!userId || !market || !direction || !patternType || !status) {
      return res.status(400).json({
        message:
          "Missing required fields (userId, market, direction, patternType, status).",
      });
    }

    const { db } = await connectToDatabase();
    const appData = db.collection("trading");

    const mongoId = new ObjectId();
    const now = new Date().toISOString();

    const doc: DbTradingSetup = {
      _id: mongoId,
      type: "trading_setup_v2",
      userId,
      createdAt: now,
      updatedAt: now,
      market,
      direction,

      chartImageUrl,

      // Legacy-TFs + neue Bias-Felder
      htfTf,
      htfBias,
      entryTf,
      htfD1Bias,
      htfH4Bias,
      htfH1Bias,

      waitFor,

      setupLabel,
      patternType,
      keyLevels,
      structureNotes,

      plannedEntryMin,
      plannedEntryMax,
      plannedStop,
      plannedTarget,
      plannedRR,

      status,
      decision,
      outcome,
      linkedTradeId,
      resolvedAt,

      entryChecklistTemplate,
      entryChecklistState,

      gameGrade,
      thoughtProcess,
      reflection,
    };

    await appData.insertOne(doc);

    // _id → string mappen, type rauswerfen
    const { type, _id, ...rest } = doc;
    const setupToReturn: TradingSetup = {
      ...rest,
      _id: _id.toHexString(),
    };

    return res.status(201).json({ setup: setupToReturn });
  } catch (err) {
    console.error("Error creating trading setup", err);
    return res
      .status(500)
      .json({ message: "Internal server error while creating setup." });
  }
}
