import { NextApiRequest, NextApiResponse } from "next";
import { connectToDatabase } from "../db/mongo";
import { Account } from "@/utils/interface";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ message: "Method not allowed" });

  const { userId } = req.query;
  if (!userId || typeof userId !== "string") {
    return res.status(400).json({ message: "Missing userId" });
  }

  try {
    const { db } = await connectToDatabase();
    const collection = db.collection<Account>("trading");
    const accounts = await collection.find({ userId }).toArray();
    return res.status(200).json({ accounts });
  } catch (err) {
    console.error("get accounts error", err);
    return res.status(500).json({ message: "server error" });
  }
}