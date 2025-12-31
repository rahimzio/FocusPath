// pages/api/trading/trades/create.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { ObjectId } from "mongodb";
import { connectToDatabase } from "@/pages/api/db/mongo";
import { TradeEntry } from "../../../../components/trading1/interface";

type FieldKey = keyof Pick<
  TradeEntry,
  | "userId"
  | "date"
  | "symbol"
  | "entry"
  | "exit"
  | "stopLoss"
  | "result"
  | "rating"
>;

function getMissingFields(body: Partial<TradeEntry>): FieldKey[] {
  const missing: FieldKey[] = [];

  if (!body.userId) missing.push("userId");
  if (!body.date) missing.push("date");
  if (!body.symbol) missing.push("symbol");

  // können 0 sein -> nur null/undefined checken
  if (body.entry == null) missing.push("entry");
  if (body.exit == null) missing.push("exit");
  if (body.stopLoss == null) missing.push("stopLoss");
  if (body.rating == null) missing.push("rating");

  if (!body.result) missing.push("result");

  return missing;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed. Use POST." });
  }

  try {
    // Frontend schickt: { userId, payload }
    const { userId, payload } = req.body as {
      userId?: string;
      payload?: Partial<TradeEntry>;
    };

    if (!payload) {
      return res.status(400).json({ message: "Missing payload." });
    }

    // UserId aus Body überschreibt nichts im Payload
    const body: Partial<TradeEntry> = {
      ...payload,
      userId,
    };

    const missingFields = getMissingFields(body);
    if (missingFields.length > 0) {
      return res.status(400).json({
        message: "Missing required fields.",
        missingFields,
      });
    }

    if (!["win", "loss", "BE"].includes(body.result as string)) {
      return res.status(400).json({
        message: "Invalid result. Allowed: win, loss, BE.",
        field: "result",
        allowed: ["win", "loss", "BE"],
        received: body.result ?? null,
      });
    }

    const {
      userId: bodyUserId,
      date,
      symbol,
      // Basic Linking
      setup,
      setupLabel,
      setupId,
      groupId,
      groupName,
      // Trade-Parameter
      entry,
      exit,
      stopLoss,
      positionSize,
      result,
      pnl,
      rMultiple,
      rating,
      screenshotUrl,
      notes,
      tags,
      // Kontext
      session,
      dayOfWeek,
      accountName,
      gameGrade,
      thoughts,
      ruleBreak,
      ruleBreakNotes,
      // ICC Core
      isICC,
      iccTrendHTF,
      iccTrendPart,
      iccFourHStatus,
      iccOneHStructure,
      iccTimeframeCombo,
      iccChecklistPriceAt4h,
      iccChecklist1HFollowsTrend,
      iccChecklistBosSwing,
      iccChecklistTfCorrelation,
      iccChecklistEntryImpulseZone,
      iccChecklistSessionTime,
      iccChecklistTargetOppositeSide,
      // Risk Engine
      accountType,
      riskPercent,
      plannedRR,
      // Management
      managementStatus,
      managementMarkedHighsLows,
      managementTookPartialsAtTp1,
      managementClosedOnTrendChange,
      managementHomeTradeUntilSessionEnd,
      // ICC Tags / Psych
      iccTags,
      psychReason,
      psychComment,
      violatedIccRules,
      violatedRulesNotes,
      // Replay
      preScreenshotUrl,
      postScreenshotUrl,
      // Review
      iccReviewNeeded,
      iccReviewNotes,
    } = body;

    const { db } = await connectToDatabase();
    const appData = db.collection("trading");

    const _id = new ObjectId();
    const now = new Date().toISOString();

    const doc: Omit<TradeEntry, "_id"> & { _id: ObjectId; type: string } = {
      _id,
      type: "trading_trade_v1",

      userId: bodyUserId!,
      date: date!,
      symbol: symbol!,

      setup,
      setupLabel,
      setupId,
      groupId,
      groupName,

      entry: entry!, // durch getMissingFields garantiert nicht null/undefined
      exit: exit!,
      stopLoss: stopLoss!,
      positionSize: positionSize ?? 0,
      result: result as TradeEntry["result"],
      pnl: pnl ?? 0,
      rMultiple,
      rating: rating!,

      screenshotUrl,
      notes,
      tags,

      session,
      dayOfWeek,
      accountName,
      gameGrade,
      thoughts,
      ruleBreak,
      ruleBreakNotes,

      // ICC Core
      isICC,
      iccTrendHTF,
      iccTrendPart,
      iccFourHStatus,
      iccOneHStructure,
      iccTimeframeCombo,
      iccChecklistPriceAt4h,
      iccChecklist1HFollowsTrend,
      iccChecklistBosSwing,
      iccChecklistTfCorrelation,
      iccChecklistEntryImpulseZone,
      iccChecklistSessionTime,
      iccChecklistTargetOppositeSide,

      // Risk
      accountType,
      riskPercent,
      plannedRR,

      // Management
      managementStatus,
      managementMarkedHighsLows,
      managementTookPartialsAtTp1,
      managementClosedOnTrendChange,
      managementHomeTradeUntilSessionEnd,

      // ICC Tags / Psych
      iccTags,
      psychReason,
      psychComment,
      violatedIccRules,
      violatedRulesNotes,

      // Replay
      preScreenshotUrl,
      postScreenshotUrl,

      // Review
      iccReviewNeeded,
      iccReviewNotes,

      createdAt: now,
      updatedAt: now,
    };

    await appData.insertOne(doc);

    const { type, _id: mongoId, ...rest } = doc;
    const tradeToReturn: TradeEntry = {
      ...rest,
      _id: mongoId.toHexString(),
    };

    return res.status(201).json({ trade: tradeToReturn });
  } catch (err) {
    console.error("Error creating trade", err);
    return res.status(500).json({ message: "Internal server error" });
  }
}
