import { NextApiRequest, NextApiResponse } from "next";
import { connectToDatabase } from "../db/mongo";
import { ObjectId } from "mongodb";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "DELETE") return res.status(405).json({ message: "Method not allowed" });

  const { id, userId } = req.query;
  if (!id || typeof id !== "string" || !userId || typeof userId !== "string") {
    return res.status(400).json({ message: "Missing id or userId" });
  }

  try {
    const { db } = await connectToDatabase();
    const collection = db.collection("trading");

    const result = await collection.deleteOne({ _id: new ObjectId(id), userId, type: "tradeEntry" });
    if (result.deletedCount === 0) {
      return res.status(404).json({ message: "Trade not found" });
    }

    return res.status(200).json({ message: "Trade deleted" });
  } catch (err) {
    console.error("delete trade error", err);
    return res.status(500).json({ message: "server error" });
  }
}