import { NextApiRequest, NextApiResponse } from "next";
import { connectToDatabase } from "../db/mongo";
import { expense } from "@/utils/interface";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed. Use POST." });
  }

  const { userId, amount, category, date } = req.body as {
    userId?: string;
    amount?: number;
    category?: string;
    date?: string;
  };

  if (!userId || typeof amount !== "number" || !date) {
    return res.status(400).json({ message: "Missing required fields." });
  }

  try {
    const { db } = await connectToDatabase();
    const collection = db.collection<expense>("expenses");
    const timestamp = new Date().toISOString();

    const entry: expense = {
      userId,
      name: category || "Expense",
      amount,
      category: category || "", 
      frequency: "once",
      dueDate: date,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    await collection.insertOne(entry);
    return res.status(201).json({ message: "Expense added." });
  } catch (e) {
    console.error("addExpense", e);
    return res.status(500).json({ message: "Internal server error" });
  }
}