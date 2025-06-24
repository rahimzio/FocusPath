import { NextApiRequest, NextApiResponse } from "next";
import { connectToDatabase } from "../db/mongo";
import { ObjectId } from "mongodb";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "DELETE") {
    return res.status(405).json({ message: "Method not allowed. Use DELETE." });
  }

  const { moduleId, userId } = req.query;
  if (!moduleId || typeof moduleId !== "string" || !userId || typeof userId !== "string") {
    return res.status(400).json({ message: "Missing moduleId or userId" });
  }

  try {
    const { db } = await connectToDatabase();
    await db.collection("appData").deleteOne({ _id: new ObjectId(moduleId), type: "module", userId });
    return res.status(200).json({ message: "deleted" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Internal server error" });
  }
}