import { NextApiRequest, NextApiResponse } from "next";
import { connectToDatabase } from "../db/mongo";
import { ObjectId } from "mongodb";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "PUT") {
    return res.status(405).json({ message: "Method not allowed. Use PUT." });
  }

  const { userId, goalId, title, description } = req.body;

  if (!goalId || !title || !description || !userId) {
    return res.status(400).json({
      message: "Missing 'goalId', 'title', 'description' or 'userId' in request body.",
    });
  }

  try {
    const { db } = await connectToDatabase();
    const appData = db.collection("appData");

    const objectGoalId = new ObjectId(goalId);

    const updateResult = await appData.updateOne(
      { _id: objectGoalId, userId, type: "goal" },
      {
        $set: {
          title,
          description,
          updatedAt: new Date().toISOString(),
        },
      }
    );

    if (updateResult.matchedCount === 0) {
      return res.status(404).json({ message: "Ziel nicht gefunden oder gehört nicht zum Nutzer." });
    }

    console.log(`✅ Ziel ${goalId} erfolgreich aktualisiert.`);
    return res.status(200).json({ message: "Ziel erfolgreich aktualisiert." });
  } catch (error) {
    console.error("❌ Fehler beim Aktualisieren des Ziels:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}
