// pages/api/trading/delete.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { ObjectId } from "mongodb";
import { connectToDatabase } from "../db/mongo";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "DELETE") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { id, userId } = req.query;
    const uid = typeof userId === "string" ? userId.trim() : "";
    const idStr = typeof id === "string" ? id.trim() : "";

    if (!uid) return res.status(400).json({ error: "Missing userId" });
    if (!idStr) return res.status(400).json({ error: "Missing id" });

    const { db } = await connectToDatabase();
    const col = db.collection("trading");

    // id kann ObjectId oder String sein – versuch ObjectId, fallback String
    let _id: ObjectId | string = idStr;
    try { _id = new ObjectId(idStr); } catch {}

    const now = new Date().toISOString();

    const upd = await col.updateOne(
      { _id: _id as any, userId: uid, deleted: { $ne: true } },
      { $set: { deleted: true, updatedAt: now } }
    );

    if (upd.matchedCount === 0) {
      return res.status(404).json({ error: "Trade nicht gefunden" });
    }

    return res.status(200).json({ ok: true });
  } catch (e: any) {
    console.error("❌ /api/trading/delete:", e);
    return res.status(500).json({ error: e?.message ?? "Internal Server Error" });
  }
}
