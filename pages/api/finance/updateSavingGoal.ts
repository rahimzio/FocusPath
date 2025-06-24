import { NextApiRequest, NextApiResponse } from "next";
import { connectToDatabase } from "../db/mongo";
import { SavingGoal } from "@/utils/interface";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST" && req.method !== "PUT") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const { userId, title, targetAmount, currentAmount, monthlyContribution, deadline } = req.body as SavingGoal & { id?: string };
  const id = (req.body as any).id;
  if (!userId || !id) {
    return res.status(400).json({ message: "Missing userId or id" });
  }

  try {
    const { db } = await connectToDatabase();
    const collection = db.collection<SavingGoal>("savingGoals");
    const timestamp = new Date().toISOString();
    await collection.updateOne(
      { _id: id, userId },
      {
        $set: {
          title,
          targetAmount,
          currentAmount,
          monthlyContribution,
          deadline,
          updatedAt: timestamp,
        },
      }
    );
    return res.status(200).json({ message: "Goal updated" });
  } catch (e) {
    console.error("updateSavingGoal", e);
    return res.status(500).json({ message: "Internal server error" });
  }
}