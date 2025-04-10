import { NextApiRequest, NextApiResponse } from "next";
import { ObjectId } from "mongodb";
import { connectToDatabase } from "../db/mongo";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { taskId, status, userId } = req.body;

  if (!taskId || !status || !userId) {
    return res.status(400).json({ message: "taskId, status und userId sind erforderlich" });
  }

  try {
    const { db } = await connectToDatabase();
    const appData = db.collection("appData");

    const objectTaskId = new ObjectId(taskId);

    // 1. Aufgabe aktualisieren
    const updateResult = await appData.updateOne(
      { _id: objectTaskId, userId, type: "task" },
      { $set: { status, updatedAt: new Date().toISOString() } }
    );

    if (updateResult.modifiedCount !== 1) {
      return res.status(404).json({ message: "Aufgabe nicht gefunden oder nicht aktualisiert" });
    }

    // 2. Aktualisierte Aufgabe abrufen
    const updatedTask = await appData.findOne({ _id: objectTaskId, userId, type: "task" });
    if (!updatedTask) {
      return res.status(404).json({ message: "Aufgabe nach Update nicht gefunden" });
    }

    // 3. Falls Aufgabe mit Ziel verknüpft ist, berechne Fortschritt neu
    if (updatedTask.goalId) {
      const goal = await appData.findOne({
        _id: new ObjectId(updatedTask.goalId),
        userId,
        type: "goal",
      });

      if (goal) {
        const tasksForGoal = await appData
          .find({ goalId: updatedTask.goalId, userId, type: "task" })
          .toArray();

        const total = tasksForGoal.length;
        const completed = tasksForGoal.filter((t) => t.status === "completed").length;
        const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

        await appData.updateOne(
          { _id: new ObjectId(updatedTask.goalId), userId, type: "goal" },
          { $set: { progress }, $currentDate: { updatedAt: true } }
        );
      }
    }

    return res.status(200).json({
      message: "Aufgabe aktualisiert und Ziel-Fortschritt neu berechnet",
    });
  } catch (error) {
    console.error("❌ Fehler bei updateTaskAndGoalProgress:", error);
    return res.status(500).json({ message: "Serverfehler beim Aktualisieren der Aufgabe" });
  }
}
