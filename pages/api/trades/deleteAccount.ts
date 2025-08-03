import { NextApiRequest, NextApiResponse } from "next";
import { connectToDatabase } from "../db/mongo";
import { ObjectId } from "mongodb";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "DELETE") return res.status(405).json({ message: "Method not allowed" });

  const { id } = req.query;
  if (!id || typeof id !== "string") {
    return res.status(400).json({ message: "Missing id" });
  }

  try {
    const { db } = await connectToDatabase();
    const collection = db.collection("trading_accounts");
    const result = await collection.deleteOne({ _id: new ObjectId(id) });
    if (result.deletedCount === 0) {
      return res.status(404).json({ message: "Account not found" });
    }
    return res.status(200).json({ message: "deleted" });
  } catch (err) {
    console.error("delete account error", err);
    return res.status(500).json({ message: "server error" });
  }
}