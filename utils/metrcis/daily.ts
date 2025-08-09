mport { NextApiRequest, NextApiResponse } from "next";
import { connectToDatabase } from "../db/mongo";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed. Use GET." });
  }

  const { userId, date } = req.query;
  if (typeof userId !== "string" || typeof date !== "string") {
    return res.status(400).json({ message: "Missing userId or date" });
  }

  try {
    const { db } = await connectToDatabase();
    const appData = db.collection("appData");

    const scores = await appData.findOne({ type: "daily_scores", userId, date });

    if (!scores) {
      return res.status(404).json({ message: "No scores found" });
    }

    return res.status(200).json(scores);
  } catch (err: any) {
    console.error("Error fetching daily metrics", err);
    return res.status(500).json({ message: "Internal server error" });
  }
}