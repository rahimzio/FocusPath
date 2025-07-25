import { NextApiRequest, NextApiResponse } from "next";
import { connectToDatabase } from "../db/mongo";
import { IncomeEntry } from "@/utils/interface";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed. Use POST." });
  }

  const { userId, month, amount, note } = req.body as IncomeEntry;
  if (!userId || !month || typeof amount !== "number") {
    return res.status(400).json({ message: "Missing required fields." });
  }

  try {
    const { db } = await connectToDatabase();
    const collection = db.collection<IncomeEntry>("incomeEntries");
    const timestamp = new Date().toISOString();
    const existing = await collection.findOne({ userId, month });
    if (existing) {
      await collection.updateOne(
        { userId, month },
        { $set: { amount, note, updatedAt: timestamp } }
      );
      return res.status(200).json({ message: "Income updated." });
    }
    const entry: IncomeEntry = {
      userId,
      month,
      amount,
      note,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    await collection.insertOne(entry);
    return res.status(201).json({ message: "Income added." });
  } catch (e) {
    console.error("addIncome", e);
    return res.status(500).json({ message: "Internal server error" });
  }
}