import { NextApiRequest, NextApiResponse } from "next";
import { connectToDatabase } from "../db/mongo";
import { WeeklyStat } from "@/utils/interface";
import { getCached, setCached } from "@/utils/redis";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { userId, week_start } = req.query;
  if (!userId || typeof userId !== "string") {
    return res.status(400).json({ message: "Missing userId" });
  }
  const cacheKey = `weekly:${userId}:${week_start || "latest"}`;
  const cached = await getCached(cacheKey);
  if (cached) {
    return res.status(200).json({ stats: cached, cached: true });
  }

  const { db } = await connectToDatabase();
  const collection = db.collection<WeeklyStat>("weekly_stats");
  let stats: WeeklyStat | null = null;
  if (week_start && typeof week_start === "string") {
    stats = await collection.findOne({ userId, week_start });
  } else {
    stats = await collection.find({ userId }).sort({ week_start: -1 }).limit(1).next();
  }
  if (!stats) return res.status(404).json({ message: "not found" });
  await setCached(cacheKey, stats, 60);
  return res.status(200).json({ stats, cached: false });
}