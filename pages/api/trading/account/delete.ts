// pages/api/trading/account/delete.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { connectToDatabase, getTradingCollection } from "../../db/mongo";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "DELETE") return res.status(405).json({ error: "Method not allowed" });
  try {
    const { db } = await connectToDatabase();
    const col = await getTradingCollection(db);

    const { userId, accountId, hard } = (req.query ?? {}) as Record<string, string | undefined>;
    const usr = String(userId || "").trim();
    const acc = String(accountId || "").trim();

    if (!usr) return res.status(400).json({ error: "userId ist erforderlich" });
    if (!acc) return res.status(400).json({ error: "accountId ist erforderlich" });

    if (hard === "true") {
      const del = await col.deleteOne({ _id: acc as any, type: "account", userId: usr });
      return res.status(200).json({ ok: true, deleted: del.deletedCount });
    } else {
      const now = new Date().toISOString();
      const upd = await col.updateOne(
        { _id: acc as any, type: "account", userId: usr },
        { $set: { deleted: true, archived: true, updatedAt: now } }
      );
      if (upd.matchedCount === 0) return res.status(404).json({ error: "Account nicht gefunden" });
      return res.status(200).json({ ok: true, softDeleted: true });
    }
  } catch (err: any) {
    console.error("❌ /api/trading/account/delete:", err);
    return res.status(500).json({ error: err?.message ?? "Internal Server Error" });
  }
}
