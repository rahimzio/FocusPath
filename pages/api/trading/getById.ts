import type { NextApiRequest, NextApiResponse } from "next";
import { ObjectId } from "mongodb";
import { connectToDatabase } from "../db/mongo";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ message: "Method not allowed" });

  const { id, userId } = req.query;
  if (!id || typeof id !== "string") return res.status(400).json({ message: "Missing id" });
  if (!userId || typeof userId !== "string") return res.status(400).json({ message: "Missing userId" });

  let _id: ObjectId;
  try {
    _id = new ObjectId(id);
  } catch {
    return res.status(400).json({ message: "Invalid id" });
  }

  try {
    const { db } = await connectToDatabase();
    const trade = await db
      .collection("trading")
      .findOne({ _id, userId, type: "tradeEntry" });

    if (!trade) return res.status(404).json({ message: "Trade not found" });
    return res.status(200).json({ trade });
  } catch (e) {
    console.error("getById error:", e);
    return res.status(500).json({ message: "Internal server error" });
  }
}
