import { NextApiRequest, NextApiResponse } from "next";
import { connectToDatabase } from "../db/mongo";
import { UserConfigDocument } from "@/utils/interface";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { db } = await connectToDatabase();
  const collection = db.collection<UserConfigDocument>("appData");

  if (req.method === "GET") {
    const { userId } = req.query;
    if (!userId || typeof userId !== "string") {
      return res.status(400).json({ message: "Missing or invalid userId" });
    }
    const config = await collection.findOne({ type: "userConfig", userId });
    return res.status(200).json({ categories: config?.categories || [] });
  }

  if (req.method === "POST") {
    const { userId, categories } = req.body as { userId?: string; categories?: string[] };
    if (!userId || !Array.isArray(categories)) {
      return res.status(400).json({ message: "Missing fields" });
    }
    await collection.updateOne(
      { type: "userConfig", userId },
      { $set: { categories, updatedAt: new Date().toISOString() } },
      { upsert: true }
    );
    return res.status(200).json({ message: "saved" });
  }

  return res.status(405).json({ message: "Method not allowed" });
}