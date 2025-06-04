import { NextApiRequest, NextApiResponse } from "next";
import { connectToDatabase } from "../db/mongo";
import { ObjectId } from "mongodb";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "PATCH") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const { goalId, progress, completedAt } = req.body;

  if (!goalId || progress === undefined) {
    return res.status(400).json({ message: "goalId und progress sind erforderlich" });
  }

  try {
    const { db } = await connectToDatabase();
    const appData = db.collection("appData");

    await appData.updateOne(
      { _id: new ObjectId(goalId), type: "goal" },
      {
        $set: {
          progress,
          completedAt: completedAt ?? undefined,
          updatedAt: new Date().toISOString(),
        },
      }
    );

    return res.status(200).json({ message: "Ziel aktualisiert", progress, completedAt });
  } catch (error) {
    console.error("Fehler beim Aktualisieren:", error);
    return res.status(500).json({ message: "Fehler beim Aktualisieren" });
  }
}
