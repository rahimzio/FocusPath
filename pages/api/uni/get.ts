import { NextApiRequest, NextApiResponse } from "next";
import { connectToDatabase } from "../db/mongo";
import { ObjectId } from "mongodb";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed. Use GET." });
  }

  const { moduleId, userId } = req.query;
  if (!moduleId || typeof moduleId !== "string" || !userId || typeof userId !== "string") {
    return res.status(400).json({ message: "Missing moduleId or userId" });
  }

  try {
    const { db } = await connectToDatabase();
    const mod = await db
      .collection("appData")
      .findOne({ _id: new ObjectId(moduleId), type: "module", userId }, { projection: { type: 0 } });
    if (!mod) return res.status(404).json({ message: "not found" });
    return res.status(200).json({ module: mod });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Internal server error" });
  }
}