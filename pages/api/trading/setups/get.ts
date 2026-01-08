// pages/api/trading/setups/get.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { ObjectId } from "mongodb";
import { connectToDatabase } from "@/pages/api/db/mongo";

type DbSetup = {
  _id: any;
  type: "trading_setup_v2";
  userId: string;
  deleted?: boolean;
  [key: string]: any;
};

function toStrId(x: any) {
  try {
    return String(x?.toHexString ? x.toHexString() : x);
  } catch {
    return String(x);
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const startedAt = Date.now();

  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed. Use GET." });
  }

  try {
    const userId = typeof req.query.userId === "string" ? req.query.userId : "";
    const id = typeof req.query.id === "string" ? req.query.id : "";

    if (!userId) return res.status(400).json({ message: "userId required" });
    if (!id) return res.status(400).json({ message: "id required" });

    let _id: ObjectId;
    try {
      _id = new ObjectId(id);
    } catch {
      return res.status(400).json({ message: "invalid id" });
    }

    const { db } = await connectToDatabase();
    const col = db.collection<DbSetup>("trading");

    const doc = await col.findOne({
      _id: _id,
      type: "trading_setup_v2",
      userId,
      deleted: { $ne: true },
    });

    if (!doc) return res.status(404).json({ message: "Setup not found" });

    const { _id: mongoId, type, ...rest } = doc as any;

    return res.status(200).json({
      setup: { ...rest, _id: toStrId(mongoId) },
      meta: { durationMs: Date.now() - startedAt },
    });
  } catch (err: any) {
    console.error("[API setups/get] ERROR:", err?.message, err);
    return res.status(500).json({ message: "Internal server error." });
  }
}
