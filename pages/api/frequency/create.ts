import { NextApiRequest, NextApiResponse } from "next";
import { ObjectId } from "mongodb";
import { connectToDatabase } from "../db/mongo";
import { recalcDailyScores } from "@/utils/metrcis/recalcDailyScores";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed. Use POST." });
  }

  const { userId, title, dueDate, weight = "tiny", source } = req.body;
  if (!userId || !title || !dueDate) {
    return res.status(400).json({ message: "Missing required fields." });
  }

  try {
    const { db } = await connectToDatabase();
    const appData = db.collection("appData");

    const _id = new ObjectId();
    const createdAt = new Date().toISOString();

    await appData.insertOne({
      _id,
      type: "commitment",
      userId,
      title,
      dueDate,
      weight,
      status: "open",
      source,
      createdAt,
    });

    await recalcDailyScores(userId, dueDate);

    return res.status(201).json({ id: _id.toHexString() });
  } catch (err: any) {
    console.error("Error creating commitment", err);
    return res.status(500).json({ message: "Internal server error" });
  }
}