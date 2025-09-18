// pages/api/trading/account/delete.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { ObjectId } from "mongodb";
import { connectToDatabase, getTradingCollection } from "../../db/mongo";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "DELETE") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { db } = await connectToDatabase();
    const col = await getTradingCollection(db);

    // defensive indexes (idempotent)
    try {
      await Promise.all([
        col.createIndex({ type: 1, userId: 1 }),
        col.createIndex({ type: 1, userId: 1, archived: 1, deleted: 1 }),
      ]);
    } catch {}

    const { userId, accountId, hard } = (req.query ?? {}) as Record<string, string | undefined>;
    const usr = String(userId || "").trim();
    const accStr = String(accountId || "").trim();

    if (!usr) return res.status(400).json({ error: "userId ist erforderlich" });
    if (!accStr) return res.status(400).json({ error: "accountId ist erforderlich" });

    // accountId als ObjectId interpretieren (falls möglich), sonst String-Fallback
    let idFilter: any = { _id: accStr as any };
    try {
      const objId = new ObjectId(accStr);
      idFilter = { $or: [{ _id: objId }, { _id: accStr as any }] };
    } catch {
      // kein gültiges ObjectId-Format → beim String bleiben
    }

    const baseMatch = { type: "account", userId: usr };

    if (hard === "true") {
      // Hard Delete: Dokument wirklich entfernen
      const del = await col.deleteOne({ ...baseMatch, ...idFilter });
      return res.status(200).json({ ok: true, deleted: del.deletedCount });
    } else {
      // Soft Delete: Flags setzen + Timestamps
      const now = new Date().toISOString();
      const upd = await col.updateOne(
        { ...baseMatch, ...idFilter },
        {
          $set: {
            deleted: true,
            archived: true,
            status: "deleted",
            deletedAt: now,
            updatedAt: now,
          },
        }
      );

      if (upd.matchedCount === 0) return res.status(404).json({ error: "Account nicht gefunden" });
      return res.status(200).json({ ok: true, softDeleted: true });
    }
  } catch (err: any) {
    console.error("❌ /api/trading/account/delete:", err);
    return res.status(500).json({ error: err?.message ?? "Internal Server Error" });
  }
}
