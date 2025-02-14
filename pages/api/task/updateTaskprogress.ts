// pages/api/updateTaskProgress.ts
import { NextApiRequest, NextApiResponse } from "next";
import { ObjectId } from "mongodb";
import { connectToDatabase, disconnectFromDatabase } from "../db/mongo";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const { taskId, progress } = req.body;

  // Validierung
  if (!taskId || typeof progress !== "number") {
    return res
      .status(400)
      .json({ message: "Ungültige Anfrage: taskId und progress benötigt" });
  }

  try {
    const { db } = await connectToDatabase();
    const tasksCollection = db.collection("tasks");

    // Fortschritt aktualisieren
    const updateResult = await tasksCollection.updateOne(
      { _id: new ObjectId(taskId) },
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

    // Option: Wenn progress >= 100 => Status = "completed"
    if (progress >= 100) {
      await tasksCollection.updateOne(
        { _id: new ObjectId(taskId) },
        { $set: { status: "completed" } }
      );
    }

    return res.status(200).json({ message: "Fortschritt erfolgreich aktualisiert" });
  } catch (error) {
    console.error("Fehler beim Aktualisieren des Task-Fortschritts:", error);
    return res.status(500).json({ message: "Fehler beim Aktualisieren des Fortschritts" });
  } finally {
    await disconnectFromDatabase();
  }
}
