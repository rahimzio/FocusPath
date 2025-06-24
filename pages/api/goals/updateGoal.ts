// pages/api/goals/updateGoal.ts
import { NextApiRequest, NextApiResponse } from "next";
import { connectToDatabase } from "../db/mongo";
import { ObjectId } from "mongodb";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "PUT") {
    return res.status(405).json({ message: "Method not allowed. Use PUT." });
  }

  const { goalId, userId, ...updates } = req.body;

  if (!goalId) {
    return res.status(400).json({ message: "Missing 'goalId' in request body." });
  }

  try {
    const { db } = await connectToDatabase();
    const appData = db.collection("appData");

    const objectGoalId = new ObjectId(goalId);

    const updatePayload: any = {
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    const updateResult = await appData.updateOne(
      { _id: objectGoalId },
      { $set: updatePayload }
    );

    if (updateResult.matchedCount === 0) {
      return res.status(404).json({ message: "Ziel nicht gefunden." });
    }

    console.log(`✅ Ziel ${goalId} aktualisiert:`, updatePayload);
    return res.status(200).json({ message: "Ziel erfolgreich aktualisiert." });
  } catch (error) {
    console.error("❌ Fehler beim Aktualisieren des Ziels:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}
