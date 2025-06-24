import { NextApiRequest, NextApiResponse } from "next";
import { connectToDatabase } from "../db/mongo";
import { BudgetEntry } from "@/utils/interface";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed. Use POST." });
  }

  const { userId, week, budget, spent, categories } = req.body as BudgetEntry;
  if (!userId || !week || typeof budget !== "number" || typeof spent !== "number") {
    return res.status(400).json({ message: "Missing required fields." });
  }

  try {
    const { db } = await connectToDatabase();
    const collection = db.collection<BudgetEntry>("budgetEntries");
    const timestamp = new Date().toISOString();

    const existing = await collection.findOne({ userId, week });
    if (existing) {
      await collection.updateOne(
        { userId, week },
        {
          $set: {
            budget,
            spent,
            categories,
            updatedAt: timestamp,
          },
        }
      );
      return res.status(200).json({ message: "Budget updated" });
    } else {
      const entry: BudgetEntry = {
        userId,
        week,
        budget,
        spent,
        categories: categories || [],
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      await collection.insertOne(entry);
      return res.status(201).json({ message: "Budget created" });
    }
  } catch (error: any) {
    console.error("updateWeeklyBudget error", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}