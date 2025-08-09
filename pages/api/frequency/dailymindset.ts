import { NextApiRequest, NextApiResponse } from "next";
import { connectToDatabase } from "../db/mongo";
import { recalcDailyScores } from "@/utils/metrcis/recalcDailyScores";
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed. Use POST." });
  }

  const { userId, date, ...scores } = req.body;
  if (!userId || !date) {
    return res.status(400).json({ message: "Missing userId or date" });
  }

  try {
    const { db } = await connectToDatabase();
    const appData = db.collection("appData");

    const payload = {
      type: "mindset",
      userId,
      date,
      ...scores,
      createdAt: new Date().toISOString(),
    };

    const existing = await appData.findOne({ type: "mindset", userId, date });
    if (existing) {
      await appData.updateOne({ _id: existing._id }, { $set: payload });
    } else {
      await appData.insertOne(payload);
    }

    await recalcDailyScores(userId, date);

    return res.status(200).json({ message: "Mindset saved" });
  } catch (err: any) {
    console.error("Error saving mindset", err);
    return res.status(500).json({ message: "Internal server error" });
  }
}