// pages/api/task/updateTaskAndGoalProgress.ts
import { NextApiRequest, NextApiResponse } from "next";
import { ObjectId } from "mongodb";
import { connectToDatabase } from "../db/mongo";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { taskId, status } = req.body;

  if (!taskId || !status) {
    return res.status(400).json({ message: "Fehlende taskId oder Status" });
  }

  try {
    const { db } = await connectToDatabase();
    const tasksCollection = db.collection("tasks");
    const goalsCollection = db.collection("goals");

    const objectTaskId = typeof taskId === "string" ? new ObjectId(taskId) : taskId;

    // 1. Aufgabe aktualisieren
    const updateResult = await tasksCollection.updateOne(
      { _id: objectTaskId },
      { $set: { status, updatedAt: new Date().toISOString() } }
    );

    if (updateResult.modifiedCount !== 1) {
      return res.status(404).json({ message: "Aufgabe nicht gefunden oder nicht geändert" });
    }

    // 2. Aktualisierte Aufgabe abrufen
    const updatedTask = await tasksCollection.findOne({ _id: objectTaskId });
    if (!updatedTask) {
      return res.status(404).json({ message: "Aufgabe nicht gefunden (nach Update)" });
    }

    // 3. Wenn mit Ziel verknüpft → Fortschritt neu berechnen
    if (updatedTask.goalId) {
      const goalObjectId = new ObjectId(updatedTask.goalId);
      const goalDoc = await goalsCollection.findOne({ _id: goalObjectId });

      if (goalDoc) {
        const tasksForGoal = await tasksCollection
          .find({ goalId: updatedTask.goalId })
          .toArray();

        const total = tasksForGoal.length;
        const completed = tasksForGoal.filter((t) => t.status === "completed").length;
        const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

        await goalsCollection.updateOne(
          { _id: goalObjectId },
          { $set: { progress }, $currentDate: { updatedAt: true } }
        );
      }
    }

    return res.status(200).json({
      message: "Aufgabe aktualisiert und Fortschritt des Ziels neu berechnet",
    });
  } catch (error) {
    console.error("❌ Fehler beim Aktualisieren der Aufgabe:", error);
    return res.status(500).json({ message: "Fehler beim Aktualisieren der Aufgabe" });
  }
}
