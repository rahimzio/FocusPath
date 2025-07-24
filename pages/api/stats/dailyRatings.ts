// pages/api/stats/dailyRatings.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { connectToDatabase } from "../db/mongo";


export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { userId } = req.query;
  console.log("📥 API CALL: /api/stats/dailyRatings", userId);

    if (!userId || typeof userId !== "string") {
    return res.status(400).json({ error: "Missing userId" });
  }

  try {
    const { db } = await connectToDatabase();
    const statsCol = db.collection("stats");
    const data = await statsCol
      .find({ userId })
      .project({ _id: 0, date: 1, rating: 1 })
      .sort({ date: 1 })
      .toArray();

    const dailyRatings = data.map((d: any) => ({ date: d.date, rating: d.rating }));
    return res.status(200).json({ dailyRatings });
  } catch (err) {
    console.error("❌ Error loading daily ratings:", err);
    return res.status(500).json({ error: "Failed to load daily ratings" });
  }
}
