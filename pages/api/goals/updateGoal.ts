// pages/api/goal/updateGoal.ts
import { NextApiRequest, NextApiResponse } from "next";
import { connectToDatabase, disconnectFromDatabase } from "../db/mongo";
import { Goal } from "@/utils/interface"; 

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "PUT") {
    return res.status(405).json({ message: "Method not allowed. Use PUT." });
  }

  const { goalId, title, description } = req.body;

  if (!goalId || !title || !description) {
    return res.status(400).json({ message: "Missing 'goalId', 'title' or 'description' in request body." });
  }

  try {
    const { db } = await connectToDatabase();
    const goalsColl = db.collection<Goal>("goals");

    const updateResult = await goalsColl.updateOne(
      { _id: goalId },
      { $set: { title, description, updatedAt: new Date().toISOString() } }
    );

    if (updateResult.matchedCount === 0) {
      await disconnectFromDatabase();
      return res.status(404).json({ message: "Ziel nicht gefunden." });
    }

    console.log(`Ziel ${goalId} erfolgreich aktualisiert.`);
    await disconnectFromDatabase();
    return res.status(200).json({ message: "Ziel erfolgreich aktualisiert." });
  } catch (error) {
    console.error("Fehler beim Aktualisieren des Ziels:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}
