// pages/api/goal/updateGoal.ts
import { NextApiRequest, NextApiResponse } from "next";
import { connectToDatabase } from "../db/mongo";
import { ObjectId } from "mongodb";
import { Goal } from "@/utils/interface";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "PUT") {
    return res.status(405).json({ message: "Method not allowed. Use PUT." });
  }

  const { goalId, title, description } = req.body;

  if (!goalId || !title || !description) {
    return res.status(400).json({
      message: "Missing 'goalId', 'title' or 'description' in request body.",
    });
  }

  try {
    const { db } = await connectToDatabase();
    const goalsColl = db.collection<Goal>("goals");

    const objectGoalId = typeof goalId === "string" ? new ObjectId(goalId) : goalId;

    const updateResult = await goalsColl.updateOne(
      { _id: objectGoalId },
      {
        $set: {
          title,
          description,
          updatedAt: new Date().toISOString(),
          // Optional weitere Felder einfügen:
          // startDate,
          // endDate,
          // type,
        },
      }
    );

    if (updateResult.matchedCount === 0) {
      return res.status(404).json({ message: "Ziel nicht gefunden." });
    }

    console.log(`✅ Ziel ${goalId} erfolgreich aktualisiert.`);
    return res.status(200).json({ message: "Ziel erfolgreich aktualisiert." });
  } catch (error) {
    console.error("❌ Fehler beim Aktualisieren des Ziels:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}
