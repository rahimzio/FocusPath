// pages/api/trading/trades/by-setup.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { ObjectId } from "mongodb";
import { connectToDatabase } from "@/pages/api/db/mongo";
import { TradeEntry } from "@/components/trading1/interface";

function errToJson(err: unknown) {
  if (err instanceof Error) {
    return { name: err.name, message: err.message, stack: err.stack };
  }
  return { message: String(err) };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const requestId = `by-setup_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  const startedAt = Date.now();

  if (req.method !== "GET") {
    console.warn(`[${requestId}] Method not allowed`, { method: req.method, url: req.url });
    return res.status(405).json({ message: "Method not allowed. Use GET.", requestId });
  }

  try {
    const { userId, setupId } = req.query;

    console.log(`[${requestId}] GET /api/trading/trades/by-setup`, {
      url: req.url,
      userId,
      setupId,
    });

    if (!userId || typeof userId !== "string") {
      console.warn(`[${requestId}] Missing/invalid userId`, { userId });
      return res.status(400).json({ message: "Missing or invalid userId.", requestId });
    }

    if (!setupId || typeof setupId !== "string") {
      console.warn(`[${requestId}] Missing/invalid setupId`, { setupId });
      return res.status(400).json({ message: "Missing or invalid setupId.", requestId });
    }

    const { db } = await connectToDatabase();
    console.log(`[${requestId}] DB connected`, {
      ms: Date.now() - startedAt,
      dbName: (db as any)?.databaseName ?? "unknown",
    });

    const appData = db.collection("trading");

    // ✅ Query: primär setupId als String (so wie du es speicherst)
    // ✅ Optional: wenn setupId wie ObjectId aussieht -> OR-Fallback (crasht nicht)
    const canBeObjectId = ObjectId.isValid(setupId) && setupId.length === 24;

    const mongoQuery: any = {
      userId,
      type: "trading_trade_v1",
      ...(canBeObjectId
        ? { $or: [{ setupId }, { setupId: new ObjectId(setupId) }] }
        : { setupId }),
    };

    console.log(`[${requestId}] Query`, {
      canBeObjectId,
      mongoQuery: {
        ...mongoQuery,
        // $or enthält ObjectId -> für Log als String
        ...(mongoQuery.$or
          ? {
              $or: mongoQuery.$or.map((x: any) => ({
                ...x,
                setupId: typeof x.setupId === "object" ? String(x.setupId) : x.setupId,
              })),
            }
          : {}),
      },
    });

    const docs = await appData
      .find(mongoQuery)
      .sort({ date: -1, createdAt: -1 })
      .toArray();

    console.log(`[${requestId}] Result`, {
      count: docs?.length ?? 0,
      ms: Date.now() - startedAt,
    });

    const trades: TradeEntry[] = docs.map((doc: any) => {
      const { _id, type, ...rest } = doc;
      return {
        ...rest,
        _id: _id?.toString?.() ?? String(_id),
      } as TradeEntry;
    });

    return res.status(200).json({ trades, requestId });
  } catch (err) {
    console.error(`[${requestId}] ERROR in /api/trading/trades/by-setup`, errToJson(err));
    return res.status(500).json({ message: "Internal server error", requestId, error: errToJson(err) });
  }
}
