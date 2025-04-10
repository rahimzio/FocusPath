import { NextApiRequest, NextApiResponse } from "next";
import { ObjectId } from "mongodb";
import { connectToDatabase } from "../db/mongo";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const { taskId, progress, userId } = req.body;

  if (!taskId || typeof progress !== "number" || !userId || typeof userId !== "string") {
    return res.status(400).json({ message: "Ungültige Anfrage: taskId, userId und progress benötigt" });
  }

  try {
    const { db } = await connectToDatabase();
    const tasksCollection = db.collection("appData");

    // Haupt-Update für Fortschritt
    const updateResult = await tasksCollection.updateOne(
      { _id: new ObjectId(taskId), userId, type: "task" },
      {
        $set: {
          progress,
          updatedAt: new Date().toISOString()
        }
      }
    );

    if (!updateResult.matchedCount) {
      return res.status(404).json({ message: "Aufgabe nicht gefunden" });
    }

    // Wenn 100% erreicht → Status ebenfalls setzen
    if (progress >= 100) {
      await tasksCollection.updateOne(
        { _id: new ObjectId(taskId), userId, type: "task" },
        { $set: { status: "completed" } }
      );
    }

    return res.status(200).json({ message: "Fortschritt erfolgreich aktualisiert" });
  } catch (error) {
    console.error("❌ Fehler beim Aktualisieren des Fortschritts:", error);
    return res.status(500).json({ message: "Serverfehler beim Fortschritts-Update" });
  }
}
