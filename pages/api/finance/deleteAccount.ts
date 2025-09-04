import type { NextApiRequest, NextApiResponse } from "next";
import { ObjectId } from "mongodb";
import { connectToDatabase } from "../db/mongo";
import { FINANCE_COLLECTION, nowISO } from "@/lib/api/finance";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "DELETE" && req.method !== "POST") {
    return res.status(405).json({ message: "Use DELETE or POST." });
  }

  const userId = (req.query.userId ?? (req.body?.userId)) as string | undefined;
  const accountId = (req.query.accountId ?? (req.body?.accountId)) as string | undefined;
  const purge = String((req.query.purge ?? req.body?.purge) ?? "").toLowerCase() === "true";

  if (!userId || !accountId) return res.status(400).json({ message: "Missing userId/accountId" });

  try {
    const { db } = await connectToDatabase();
    const _id = new ObjectId(accountId);

    if (purge) {
      // hart löschen
      await db.collection(FINANCE_COLLECTION).deleteOne({ _id, kind: "account", userId });
      await db.collection(FINANCE_COLLECTION).deleteMany({ kind: "transaction", userId, accountId });
      return res.status(200).json({ ok: true, purged: true });
    }

    // soft: archivieren
    const now = nowISO();
    await db.collection(FINANCE_COLLECTION).updateOne(
      { _id, kind: "account", userId },
      { $set: { archived: true, archivedAt: now, updatedAt: now } }
    );
    await db.collection(FINANCE_COLLECTION).updateMany(
      { kind: "transaction", userId, accountId },
      { $set: { archived: true, archivedAt: now, updatedAt: now } }
    );
    return res.status(200).json({ ok: true, purged: false });
  } catch (e) {
    console.error("deleteAccount", e);
    return res.status(500).json({ message: "Internal server error" });
  }
}
