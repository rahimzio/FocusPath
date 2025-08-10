import type { NextApiRequest, NextApiResponse } from "next";
import { connectToDatabase } from "../db/mongo";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const { userId, date, block, content, title } = req.body as {
    userId?: string;
    date?: string;
    block?: "morning" | "afternoon" | "evening";
    content?: string;
    title?: string;
  };

  if (!userId || !date || !block || typeof content !== "string") {
    return res.status(400).json({ message: "Missing fields" });
  }

  try {
    const { db } = await connectToDatabase();
    await db.collection("appData").updateOne(
      { userId, type: "reflection", date, block },
      {
        $set: {
          content,
          title,
          updatedAt: new Date()
        },
        $setOnInsert: { createdAt: new Date() }
      },
      { upsert: true }
    );

    return res.status(200).json({ message: "saved" });
  } catch (error) {
    console.error("Error saving reflection", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}