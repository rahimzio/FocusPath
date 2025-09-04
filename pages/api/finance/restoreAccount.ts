import type { NextApiRequest, NextApiResponse } from "next";
import { ObjectId } from "mongodb";
import { connectToDatabase } from "../db/mongo";
import { FINANCE_COLLECTION, nowISO } from "@/lib/api/finance";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST" && req.method !== "PATCH") {
    return res.status(405).json({ message: "Use POST or PATCH." });
  }
  const { userId, accountId } = (req.body ?? {}) as { userId?: string; accountId?: string };
  if (!userId || !accountId) return res.status(400).json({ message: "Missing userId/accountId" });

  try {
    const { db } = await connectToDatabase();
    const _id = new ObjectId(accountId);
    const now = nowISO();

    const acc = await db.collection(FINANCE_COLLECTION).updateOne(
      { _id, kind: "account", userId },
      { $set: { archived: false, updatedAt: now }, $unset: { archivedAt: "" } }
    );
    if (!acc.matchedCount) return res.status(404).json({ message: "Account not found" });

    await db.collection(FINANCE_COLLECTION).updateMany(
      { kind: "transaction", userId, accountId },
      { $set: { archived: false, updatedAt: now }, $unset: { archivedAt: "" } }
    );

    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error("restoreAccount", e);
    return res.status(500).json({ message: "Internal server error" });
  }
}
