import type { NextApiRequest, NextApiResponse } from "next";
import { connectToDatabase } from "../db/mongo"; // deine Helper beibehalten
import { getCached, setCached } from "@/utils/redis";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { userId, label } = req.query as { userId?: string; label?: string };
    if (!userId || !label) return res.status(400).json({ error: "userId & label required" });

    const cacheKey = `weekly_reflection:${userId}:${label}`;
    const cached = await getCached(cacheKey);
    if (cached) return res.status(200).json(cached);

    const { db } = await connectToDatabase();
    const WeeklyReflections = db.collection("weekly_reflections");
    const doc = await WeeklyReflections.findOne({ userId, label }, { projection: { _id: 0 } });

    if (!doc) return res.status(404).json({ error: "not_found" });

    await setCached(cacheKey, doc, 60 * 60);
    res.status(200).json(doc);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "internal_error" });
  }
}
