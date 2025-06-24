import { NextApiRequest, NextApiResponse } from "next";
import { connectToDatabase } from "../db/mongo";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed. Use GET." });
  }

  const { userId } = req.query;
  if (!userId || typeof userId !== "string") {
    return res.status(400).json({ message: "Missing userId" });
  }

  try {
    const { db } = await connectToDatabase();
    const modules = await db
      .collection("appData")
      .find({ type: "module", userId })
      .project({ type: 0 })
      .toArray();
    return res.status(200).json({ modules });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Internal server error" });
  }
}