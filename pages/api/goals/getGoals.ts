// pages/api/goal/getGoals.ts

import { NextApiRequest, NextApiResponse } from "next";
import { connectToDatabase } from "../db/mongo";
import { Goal } from "@/utils/interface";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed. Use GET." });
  }

  const { userId } = req.query;
  if (!userId || typeof userId !== "string") {
    return res.status(400).json({ message: "Missing or invalid userId parameter." });
  }

  try {
    const { db } = await connectToDatabase();
    const appData = db.collection("appData");

    const goals = await appData
      .find<Goal>({ type: "goal", userId })
      .project({ type: 0 }) // optional: type-Feld ausblenden
      .toArray();

    console.log(`✅ ${goals.length} Ziele geladen für userId=${userId}`);
    return res.status(200).json({ goals });
  } catch (error) {
    console.error("❌ Fehler bei getGoals:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}
