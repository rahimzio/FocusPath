import type { NextApiRequest, NextApiResponse } from "next";
import { ObjectId } from "mongodb";
import { connectToDatabase } from "../../db/connectToDatabase";
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const { userId, avoidItems, timezone } = req.body as {
    userId?: string;
    avoidItems?: { id: string; label: string; active: boolean }[];
    timezone?: string;
  };

  if (!userId || !Array.isArray(avoidItems)) {
    return res.status(400).json({ message: "Missing fields" });
  }

  try {
    const { db } = await connectToDatabase();
    await db.collection("users").updateOne(
      { _id: new ObjectId(userId) },
      {
        $set: {
          onboardingCompleted: true,
          onboardingCompletedAt: new Date(),
          avoidItems,
          ...(timezone ? { timezone } : {})
        }
      }
    );

    return res.status(200).json({ message: "onboarding completed" });
  } catch (error) {
    console.error("Error completing onboarding", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}