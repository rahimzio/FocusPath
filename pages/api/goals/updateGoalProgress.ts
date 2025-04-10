import { NextApiRequest, NextApiResponse } from "next";
import { ObjectId } from "mongodb";
import { connectToDatabase } from "../db/mongo";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const { goalId, userId } = req.body;

  if (!goalId || !userId) {
    return res.status(400).json({ message: "goalId und userId werden benötigt" });
  }

  try {
    const { db } = await connectToDatabase();
    const appData = db.collection("appData");

    const objectGoalId = new ObjectId(goalId);

    // 1. Ziel finden
    const goal = await appData.findOne({ _id: objectGoalId, userId, type: "goal" });
    if (!goal) {
      return res.status(404).json({ message: "Ziel nicht gefunden oder gehört nicht zum Nutzer" });
    }

    // 2. Tasks laden
    const taskIds = (goal.tasks || []).map((t: string) => new ObjectId(t));
    if (taskIds.length === 0) {
      await appData.updateOne(
        { _id: objectGoalId },
        { $set: { progress: 0 }, $currentDate: { updatedAt: true } }
      );
      return res.status(200).json({ message: "Keine Tasks vorhanden, Fortschritt = 0" });
    }

    const tasks = await appData
      .find({ _id: { $in: taskIds }, userId, type: "task" })
      .toArray();

    // 3. Durchschnitt berechnen
    const totalProgress = tasks.reduce((sum, task: any) => sum + (task.progress || 0), 0);
    const averageProgress = totalProgress / tasks.length;

    // 4. Ziel aktualisieren
    await appData.updateOne(
      { _id: objectGoalId, userId, type: "goal" },
      {
        $set: { progress: averageProgress },
        $currentDate: { updatedAt: true },
      }
    );

    return res.status(200).json({
      message: "Ziel-Fortschritt aktualisiert",
      progress: averageProgress,
    });
  } catch (error) {
    console.error("❌ Fehler beim Aktualisieren des Ziel-Fortschritts:", error);
    return res.status(500).json({ message: "Interner Serverfehler" });
  }
}
