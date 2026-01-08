// pages/api/trading/setups/create.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { ObjectId } from "mongodb";
import { connectToDatabase } from "@/pages/api/db/mongo";
import { TradingSetup } from "../../../../components/trading1/interface";

type SetupGameGrade = "S" | "A" | "B" | "C";

type DbTradingSetup = Omit<TradingSetup, "_id"> & {
  _id: ObjectId;
  type: "trading_setup_v2";

  // ✅ Setup Game (Frontend-konform)
  setupSelectedIds?: string[];
  setupAvgPoints?: number;
  setupGameGrade?: SetupGameGrade;

  date?: string; // YYYY-MM-DD
};

function toDateOnly(s?: string) {
  return s ? String(s).slice(0, 10) : "";
}

function uniqStrings(input: any): string[] | undefined {
  if (!Array.isArray(input)) return undefined;

  const out: string[] = [];
  const seen = new Set<string>();

  for (const raw of input) {
    const s = String(raw ?? "").trim();
    if (!s || seen.has(s)) continue;
    seen.add(s);
    out.push(s);
  }

  return out.length ? out : undefined;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed. Use POST." });
  }

  try {
    const body = req.body as Partial<TradingSetup> & {
      userId?: string;
      setupSelectedIds?: string[];
      setupAvgPoints?: number;
      setupGameGrade?: SetupGameGrade;
      date?: string;
    };

    const {
      userId,
      market,
      direction,
      patternType,
      status,

      setupSelectedIds,
      setupAvgPoints,
      setupGameGrade,
      date,

      ...rest
    } = body;

    if (!userId || !market || !direction || !patternType || !status) {
      return res.status(400).json({
        message:
          "Missing required fields (userId, market, direction, patternType, status).",
      });
    }

    const { db } = await connectToDatabase();
    const col = db.collection<DbTradingSetup>("trading");

    try {
      await Promise.all([
        col.createIndex({ type: 1, userId: 1, createdAt: -1 }),
        col.createIndex({ type: 1, userId: 1, status: 1 }),
        col.createIndex({ type: 1, userId: 1, date: -1 }),
      ]);
    } catch {
      // ignore
    }

    const now = new Date().toISOString();
    const dayKey = toDateOnly(date) || toDateOnly(now);

    const doc: DbTradingSetup = {
      _id: new ObjectId(),
      type: "trading_setup_v2",
      userId,
      createdAt: now,
      updatedAt: now,
      date: dayKey,

      ...rest,

      // ✅ Setup Game
      setupSelectedIds: uniqStrings(setupSelectedIds),
      setupAvgPoints:
        Number.isFinite(Number(setupAvgPoints))
          ? Number(setupAvgPoints)
          : undefined,
      setupGameGrade,
    };

    await col.insertOne(doc);

    const { _id, type, ...clean } = doc;

    return res.status(201).json({
      setup: {
        ...clean,
        _id: _id.toHexString(),
      },
    });
  } catch (err) {
    console.error("Error creating trading setup", err);
    return res
      .status(500)
      .json({ message: "Internal server error while creating setup." });
  }
}
