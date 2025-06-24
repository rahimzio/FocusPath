import { NextApiRequest, NextApiResponse } from "next";
import { connectToDatabase } from "../db/mongo";
import { SavingEntry } from "@/utils/interface";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed. Use GET." });
  }

  const { userId } = req.query;
  if (!userId || typeof userId !== "string") {
    return res.status(400).json({ message: "Missing or invalid userId parameter." });
  }

  try {
    const { db } = await connectToDatabase();
    const collection = db.collection<SavingEntry>("finance");

    const savings = await collection
      .find({ userId })
      .sort({ month: -1 })
      .toArray();

    return res.status(200).json({ savings });
  } catch (error: any) {
    console.error("getSavings error", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}