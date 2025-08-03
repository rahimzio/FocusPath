import { NextApiRequest, NextApiResponse } from "next";
import { connectToDatabase } from "../db/mongo";
import { Account } from "@/utils/interface";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ message: "Method not allowed" });

  const { userId, name, type, currency, startBalance } = req.body as Account;
  if (!userId || !name || !type || !currency || startBalance === undefined) {
    return res.status(400).json({ message: "Missing fields" });
  }

  try {
    const { db } = await connectToDatabase();
    const collection = db.collection<Account>("trading");
    const result = await collection.insertOne({
      userId,
      name,
      type,
      currency,
      startBalance,
      createdAt: new Date().toISOString(),
    });
    return res.status(201).json({ id: result.insertedId });
  } catch (err) {
    console.error("create account error", err);
    return res.status(500).json({ message: "server error" });
  }
}