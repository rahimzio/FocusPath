import type { NextApiRequest, NextApiResponse } from "next";
import { ObjectId } from "mongodb";
import { connectToDatabase } from "../db/mongo";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const { userId } = req.query;
  if (!userId || typeof userId !== "string") {
    return res.status(400).json({ message: "Missing or invalid userId" });
  }

  try {
    const { db } = await connectToDatabase();
    const user = await db.collection("users").findOne(
      { _id: new ObjectId(userId) },
      { projection: { avoidItems: 1 } }
    );

    return res.status(200).json({ items: user?.avoidItems ?? [] });
  } catch (error) {
    console.error("Error fetching avoid items", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}