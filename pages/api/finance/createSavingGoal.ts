import { NextApiRequest, NextApiResponse } from "next";
import { connectToDatabase } from "../db/mongo";
import { SavingGoal } from "@/utils/interface";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed. Use POST." });
  }

  const { userId, title, targetAmount, currentAmount = 0, monthlyContribution, deadline } = req.body as SavingGoal;

  if (!userId || !title || typeof targetAmount !== "number") {
    return res.status(400).json({ message: "Missing required fields." });
  }

  try {
    const { db } = await connectToDatabase();
    const collection = db.collection<SavingGoal>("savingGoals");
    const timestamp = new Date().toISOString();
    const goal: SavingGoal = {
      userId,
      title,
      targetAmount,
      currentAmount,
      createdAt: timestamp,
      updatedAt: timestamp,
      monthlyContribution,
      deadline,
    };
    await collection.insertOne(goal);
    return res.status(201).json({ message: "Goal created" });
  } catch (e) {
    console.error("createSavingGoal", e);
    return res.status(500).json({ message: "Internal server error" });
  }
}