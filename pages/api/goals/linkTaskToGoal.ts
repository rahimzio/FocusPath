// pages/api/linkTaskToGoal.ts
import { NextApiRequest, NextApiResponse } from "next";
import { ObjectId } from "mongodb";
import { connectToDatabase, disconnectFromDatabase } from "../db/mongo";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const { taskId, goalId } = req.body;

  // Validierung
  if (!taskId || !goalId) {
    return res
      .status(400)
      .json({ message: "Ungültige Anfrage: taskId und goalId benötigt" });
  }

  try {
    const { db } = await connectToDatabase();
    const tasksCollection = db.collection("tasks");
    const goalsCollection = db.collection("goals");

    // 1. Ziel checken
    const goal = await goalsCollection.findOne({ _id: new ObjectId(goalId) });
    if (!goal) {
      return res.status(404).json({ message: "Ziel nicht gefunden" });
    }

    // 2. Aufgabe checken
    const task = await tasksCollection.findOne({ _id: new ObjectId(taskId) });
    if (!task) {
      return res.status(404).json({ message: "Aufgabe nicht gefunden" });
    }

    // 3. goalId in der Aufgabe setzen
    await tasksCollection.updateOne(
      { _id: new ObjectId(taskId) },
      {
        $set: { goalId, updatedAt: new Date().toISOString() }
      }
    );

    // 4. TaskId ins Ziel pushen (falls noch nicht vorhanden)
    if (!goal.tasks?.includes(taskId)) {
      await goalsCollection.updateOne(
        { _id: new ObjectId(goalId) },
        {
          $push: { tasks: taskId },
          $currentDate: { updatedAt: true }
        }
      );
    }

    return res.status(200).json({ message: "Aufgabe erfolgreich mit Ziel verknüpft" });
  } catch (error) {
    console.error("Fehler beim Verknüpfen von Aufgabe und Ziel:", error);
    return res.status(500).json({ message: "Interner Serverfehler" });
  } finally {
    await disconnectFromDatabase();
  }
}
