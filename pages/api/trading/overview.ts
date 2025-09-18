// pages/api/trading/overview.ts
import { NextApiRequest, NextApiResponse } from "next";
import { ObjectId } from "mongodb";
import { connectToDatabase } from "../db/mongo";
import { UserAccount } from "@/utils/interface";
import { getCached, setCached } from "@/utils/redis";

function mapAccount(doc: any): UserAccount {
  if (!doc) return doc;
  return {
    ...doc,
    _id: String(doc._id),
    userId: String(doc.userId),
  } as UserAccount;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { userId, accountId, includeArchived } = req.query as {
    userId?: string;
    accountId?: string;
    includeArchived?: string;
  };

  if (!userId || typeof userId !== "string") {
    return res.status(400).json({ message: "Missing userId" });
  }

  // Cache-Key abhängig von userId + optional accountId + archiv-Flag
  const cacheKey = `account:${userId}:${accountId ?? "default"}:${includeArchived === "true" ? "arch" : "noarch"}`;
  const cached = await getCached(cacheKey);
  if (cached) {
    return res.status(200).json({ account: cached, cached: true });
  }

  const { db } = await connectToDatabase();
  const collection = db.collection<UserAccount>("trading");

  // defensive indexes (idempotent)
  try {
    await Promise.all([
      collection.createIndex({ userId: 1, type: 1 }),
      collection.createIndex({ userId: 1, type: 1, archived: 1, deleted: 1 }),
      collection.createIndex({ userId: 1, type: 1, updatedAt: -1 }),
      collection.createIndex({ userId: 1, type: 1, createdAt: -1 }),
    ]);
  } catch {}

  // Basis-Filter: nur echte Accounts + nicht gelöscht (+ standardmäßig nicht archiviert)
  const baseMatch: any = {
    userId,
    type: "account",
    deleted: { $ne: true },
    ...(includeArchived === "true" ? {} : { archived: { $ne: true } }),
  };

  let account: UserAccount | null = null;

  if (accountId) {
    // Konkretes Konto per accountId (ObjectId→String tolerant)
    let idFilter: any;
    try {
      idFilter = { _id: new ObjectId(accountId) };
    } catch {
      // Fallback, falls _id als String gespeichert wurde
      idFilter = { _id: accountId as any };
    }
    const doc = await collection.findOne({ ...baseMatch, ...idFilter });
    if (!doc) return res.status(404).json({ message: "not found" });
    account = mapAccount(doc);
  } else {
    // "Default"-Account wählen: zuletzt aktualisiert, sonst zuletzt erstellt
    const doc =
      (await collection
        .find(baseMatch, { projection: { /* optional: hier Felder einschränken */ } })
        .sort({ updatedAt: -1 })
        .limit(1)
        .next()) ||
      (await collection
        .find(baseMatch, { projection: { /* optional: hier Felder einschränken */ } })
        .sort({ createdAt: -1 })
        .limit(1)
        .next());

    if (!doc) return res.status(404).json({ message: "not found" });
    account = mapAccount(doc);
  }

  // 60s Cache
  await setCached(cacheKey, account, 60);
  return res.status(200).json({ account, cached: false });
}
