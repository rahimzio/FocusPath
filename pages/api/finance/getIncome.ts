import { NextApiRequest, NextApiResponse } from "next";
import { connectToDatabase } from "../db/mongo";
import { IncomeEntry } from "@/utils/interface";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed. Use GET." });
  }

  const { userId } = req.query;
  if (!userId || typeof userId !== "string") {
    return res.status(400).json({ message: "Missing or invalid userId" });
  }

  try {
    const { db } = await connectToDatabase();
    const collection = db.collection<IncomeEntry>("incomeEntries");
    const entries = await collection.find({ userId }).toArray();
    return res.status(200).json({ incomes: entries });
  } catch (e) {
    console.error("getIncome", e);
    return res.status(500).json({ message: "Internal server error" });
  }
}