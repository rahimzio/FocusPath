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
      { projection: { onboardingCompleted: 1, onboardingCompletedAt: 1, avoidItems: 1, timezone: 1 } }
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json({
      onboardingCompleted: user.onboardingCompleted ?? false,
      onboardingCompletedAt: user.onboardingCompletedAt ?? null,
      avoidItems: user.avoidItems ?? [],
      timezone: user.timezone ?? null
    });
  } catch (error) {
    console.error("Error fetching user data", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}