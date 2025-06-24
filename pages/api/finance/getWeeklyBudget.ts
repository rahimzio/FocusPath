import { NextApiRequest, NextApiResponse } from "next";
import { connectToDatabase } from "../db/mongo";
import { BudgetEntry } from "@/utils/interface";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed. Use GET." });
  }

  const { userId, week } = req.query;
  if (!userId || typeof userId !== "string") {
    return res.status(400).json({ message: "Missing or invalid userId." });
  }

  try {
    const { db } = await connectToDatabase();
    const collection = db.collection<BudgetEntry>("budgetEntries");
    const entry = await collection.findOne({ userId, week });
    return res.status(200).json({ budget: entry });
  } catch (error: any) {
    console.error("getWeeklyBudget error", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}