import { NextApiRequest, NextApiResponse } from "next";
import { ObjectId } from "mongodb";
import { connectToDatabase } from "../db/mongo";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed. Use POST." });
  }

  const { taskId, goalId, userId } = req.body;

  if (!taskId || !goalId || !userId) {
    return res.status(400).json({
      message: "Ungültige Anfrage: taskId, goalId und userId benötigt.",
    });
  }

  try {
    const { db } = await connectToDatabase();
    const appData = db.collection("appData");

    const goalObjectId = new ObjectId(goalId);
    const taskObjectId = new ObjectId(taskId);

    // Ziel existiert?
    const goal = await appData.findOne({ _id: goalObjectId, userId, type: "goal" });
    if (!goal) {
      return res.status(404).json({ message: "Ziel nicht gefunden" });
    }

    // Aufgabe existiert?
    const task = await appData.findOne({ _id: taskObjectId, userId, type: "task" });
    if (!task) {
      return res.status(404).json({ message: "Aufgabe nicht gefunden" });
    }

    // 1. In Aufgabe `goalId` setzen
    await appData.updateOne(
      { _id: taskObjectId, userId, type: "task" },
      {
        $set: {
          goalId: goalObjectId.toHexString(),
          updatedAt: new Date().toISOString(),
        },
      }
    );

    // 2. Aufgabe zu Ziel hinzufügen (falls nicht bereits enthalten)
    const alreadyLinked = Array.isArray(goal.tasks) && goal.tasks.includes(taskId);
    if (!alreadyLinked) {
      await appData.updateOne(
        { _id: goalObjectId, userId, type: "goal" },
        {
          $addToSet: { tasks: taskId },
          $currentDate: { updatedAt: true },
        }
      );
    }

    return res.status(200).json({ message: "Aufgabe erfolgreich mit Ziel verknüpft" });
  } catch (error) {
    console.error("❌ Fehler beim Verknüpfen von Aufgabe und Ziel:", error);
    return res.status(500).json({ message: "Interner Serverfehler" });
  }
}
