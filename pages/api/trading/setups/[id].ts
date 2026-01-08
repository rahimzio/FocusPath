// pages/api/trading/setups/[id].ts
import type { NextApiRequest, NextApiResponse } from "next";
import { ObjectId } from "mongodb";
import { connectToDatabase } from "@/pages/api/db/mongo";
import { TradingSetup } from "../../../../components/trading1/interface";

type SetupGameGrade = "S" | "A" | "B" | "C";

type DbTradingSetup = Omit<TradingSetup, "_id"> & {
  _id: ObjectId;
  type: "trading_setup_v2";
  userId: string;
  createdAt?: string;
  updatedAt?: string;
  deleted?: boolean;

  setupSelectedIds?: string[];
  setupAvgPoints?: number;
  setupGameGrade?: SetupGameGrade;
};

function stripUndefined<T extends Record<string, any>>(obj: T): Partial<T> {
  const out: any = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined) continue;
    out[k] = v;
  }
  return out;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { id } = req.query;

  if (typeof id !== "string") {
    return res.status(400).json({ message: "Invalid id" });
  }

  let mongoId: ObjectId;
  try {
    mongoId = new ObjectId(id);
  } catch {
    return res.status(400).json({ message: "Invalid id" });
  }

  const { db } = await connectToDatabase();
  const col = db.collection<DbTradingSetup>("trading");

  // ---------------- GET ----------------
  if (req.method === "GET") {
    const userId = String(req.query.userId || "");
    if (!userId) {
      return res.status(400).json({ message: "userId required" });
    }

    const doc = await col.findOne({
      _id: mongoId,
      type: "trading_setup_v2",
      userId,
      deleted: { $ne: true },
    });

    if (!doc) return res.status(404).json({ message: "Setup not found" });

    const { _id, type, ...rest } = doc;
    return res.status(200).json({
      setup: { ...rest, _id: _id.toHexString() },
    });
  }

  // ---------------- PATCH ----------------
  if (req.method === "PATCH") {
    const body = (req.body ?? {}) as {
      payload?: Partial<TradingSetup>;
    };

    const payload =
      "payload" in body ? body.payload ?? {} : (body as any);

    const userId = String((payload as any)?.userId || "").trim();
    if (!userId) {
      return res.status(400).json({ message: "userId required" });
    }

    const now = new Date().toISOString();

    const $set = stripUndefined({
      updatedAt: now,

      market: payload.market,
      direction: payload.direction,
      chartImageUrl: payload.chartImageUrl,

      htfTf: payload.htfTf,
      htfBias: payload.htfBias,
      entryTf: payload.entryTf,
      htfD1Bias: (payload as any).htfD1Bias,
      htfH4Bias: (payload as any).htfH4Bias,
      htfH1Bias: (payload as any).htfH1Bias,

      waitFor: (payload as any).waitFor,

      setupLabel: payload.setupLabel,
      patternType: payload.patternType,
      keyLevels: payload.keyLevels,
      structureNotes: payload.structureNotes,

      plannedEntryMin: payload.plannedEntryMin,
      plannedEntryMax: payload.plannedEntryMax,
      plannedStop: payload.plannedStop,
      plannedTarget: payload.plannedTarget,
      plannedRR: payload.plannedRR,

      status: payload.status,
      decision: (payload as any).decision,
      outcome: (payload as any).outcome,

      entryChecklistTemplate: (payload as any).entryChecklistTemplate,
      entryChecklistState: (payload as any).entryChecklistState,

      gameGrade: (payload as any).gameGrade,
      thoughtProcess: (payload as any).thoughtProcess,
      reflection: (payload as any).reflection,

      // ✅ Setup Game
      setupSelectedIds: (payload as any).setupSelectedIds,
      setupAvgPoints: (payload as any).setupAvgPoints,
      setupGameGrade: (payload as any).setupGameGrade,

      deleted: false,
    });

    const result = await col.updateOne(
      { _id: mongoId, type: "trading_setup_v2", userId },
      { $set }
    );

    if (!result.matchedCount) {
      return res.status(404).json({ message: "Setup not found" });
    }

    const saved = await col.findOne({
      _id: mongoId,
      type: "trading_setup_v2",
      userId,
    });

    if (!saved) {
      return res.status(404).json({ message: "Setup not found after update" });
    }

    const { _id, type, ...rest } = saved;
    return res.status(200).json({
      setup: { ...rest, _id: _id.toHexString() },
    });
  }

  // ---------------- DELETE ----------------
  if (req.method === "DELETE") {
    const userId =
      typeof req.query.userId === "string"
        ? req.query.userId
        : String((req.body as any)?.userId || "");

    if (!userId) {
      return res.status(400).json({ message: "userId required" });
    }

    await col.updateOne(
      { _id: mongoId, type: "trading_setup_v2", userId },
      { $set: { deleted: true, updatedAt: new Date().toISOString() } }
    );

    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ message: "Method not allowed" });
}
