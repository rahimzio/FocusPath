// pages/api/trading/weekly.ts
import { NextApiRequest, NextApiResponse } from "next";
import { ObjectId } from "mongodb";
import { connectToDatabase } from "../db/mongo";
import { getCached, setCached } from "@/utils/redis";
import { WeeklyStat } from "@/utils/interfaces/trading";

function mapWeeklyStat(doc: any): WeeklyStat {
  if (!doc) return doc;
  return {
    ...doc,
    _id: String(doc._id ?? new ObjectId()),
  } as WeeklyStat;
}

const isISODate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { userId, week_start, includeArchived } = req.query as {
    userId?: string;
    week_start?: string;
    includeArchived?: string;
  };

  if (!userId || typeof userId !== "string") {
    return res.status(400).json({ message: "Missing userId" });
  }
  if (week_start && typeof week_start !== "string") {
    return res.status(400).json({ message: "Invalid week_start" });
  }
  if (week_start && typeof week_start === "string" && !isISODate(week_start)) {
    // wir erwarten YYYY-MM-DD (Wochenbeginn)
    return res.status(400).json({ message: "week_start must be YYYY-MM-DD" });
  }

  const cacheKey = `weekly:${userId}:${week_start || "latest"}:${includeArchived === "true" ? "arch" : "noarch"}`;
  const cached = await getCached(cacheKey);
  if (cached) {
    return res.status(200).json({ stats: cached, cached: true });
  }

  const { db } = await connectToDatabase();
  const collection = db.collection<WeeklyStat>("weekly_stats");

  // defensive indexes (idempotent)
  try {
    await Promise.all([
      collection.createIndex({ userId: 1, week_start: -1 }),
      collection.createIndex({ userId: 1, archived: 1, deleted: 1 }),
    ]);
  } catch {}

  const baseMatch: any = {
    userId,
    deleted: { $ne: true },
    ...(includeArchived === "true" ? {} : { archived: { $ne: true } }),
  };

  let statsDoc: WeeklyStat | null = null;

  if (week_start) {
    // konkreter Wochenstart
    const doc = await collection.findOne({ ...baseMatch, week_start });
    if (!doc) return res.status(404).json({ message: "not found" });
    statsDoc = mapWeeklyStat(doc);
  } else {
    // neueste Woche
    const doc = await collection
      .find(baseMatch)
      .sort({ week_start: -1 })
      .limit(1)
      .next();
    if (!doc) return res.status(404).json({ message: "not found" });
    statsDoc = mapWeeklyStat(doc);
  }

  await setCached(cacheKey, statsDoc, 60);
  return res.status(200).json({ stats: statsDoc, cached: false });
}
