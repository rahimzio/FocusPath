// pages/api/updateGoalProgress.ts
import { NextApiRequest, NextApiResponse } from "next";
import { ObjectId } from "mongodb";
import { connectToDatabase, disconnectFromDatabase } from "../db/mongo";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const { goalId } = req.body;

  if (!goalId) {
    return res.status(400).json({ message: "goalId wird benötigt" });
  }

  try {
    const { db } = await connectToDatabase();
    const goalsCollection = db.collection("goals");
    const tasksCollection = db.collection("tasks");

    // 1. Ziel finden
    const goal = await goalsCollection.findOne({ _id: new ObjectId(goalId) });
    if (!goal) {
      return res.status(404).json({ message: "Ziel nicht gefunden" });
    }

    // 2. Zu diesem Ziel gehörende Tasks abrufen
    const taskIds = goal.tasks?.map((t: string) => new ObjectId(t)) || [];
    if (!taskIds.length) {
      // Falls keine Tasks vorhanden -> Fortschritt = 0
      await goalsCollection.updateOne(
        { _id: new ObjectId(goalId) },
        {
          $set: { progress: 0 },
          $currentDate: { updatedAt: true }
        }
      );
      return res.status(200).json({ message: "Keine Tasks vorhanden, Fortschritt = 0" });
    }

    const tasks = await tasksCollection.find({ _id: { $in: taskIds } }).toArray();

    // 3. Fortschritt berechnen (z.B. Durchschnitt)
    const totalProgress = tasks.reduce((sum, task: any) => sum + (task.progress || 0), 0);
    const averageProgress = totalProgress / tasks.length;

    // 4. Ziel updaten
    await goalsCollection.updateOne(
      { _id: new ObjectId(goalId) },
      {
        $set: { progress: averageProgress },
        $currentDate: { updatedAt: true }
      }
    );

    return res
      .status(200)
      .json({ message: "Ziel-Fortschritt aktualisiert", progress: averageProgress });
  } catch (error) {
    console.error("Fehler beim Aktualisieren des Ziel-Fortschritts:", error);
    return res.status(500).json({ message: "Interner Serverfehler" });
  } finally {
    await disconnectFromDatabase();
  }
}
