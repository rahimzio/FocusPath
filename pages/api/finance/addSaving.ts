import { NextApiRequest, NextApiResponse } from "next";
import { connectToDatabase } from "../db/mongo";
import { SavingEntry } from "@/utils/interface";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed. Use POST." });
  }

  const { userId, month, amount, note } = req.body as SavingEntry;

  if (!userId || !month || typeof amount !== "number") {
    return res.status(400).json({ message: "Missing required fields." });
  }

  try {
    const { db } = await connectToDatabase();
    const collection = db.collection<SavingEntry>("finance");

    const existing = await collection.findOne({ userId, month });
    const timestamp = new Date().toISOString();

    if (existing) {
      await collection.updateOne(
        { userId, month },
        { $set: { amount, note, updatedAt: timestamp } }
      );
      return res.status(200).json({ message: "Saving updated." });
    } else {
      const entry: SavingEntry = {
        userId,
        month,
        amount,
        note,
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      await collection.insertOne(entry);
      return res.status(201).json({ message: "Saving created." });
    }
  } catch (error: any) {
    console.error("addSaving error", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}