import { NextApiRequest, NextApiResponse } from "next";
import { ObjectId } from "mongodb";
import { connectToDatabase } from "../db/mongo";
import { GoalDocument } from "@/utils/interface"; // wichtig!

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const { taskId, goalId } = req.body;

  if (!taskId || !goalId) {
    return res.status(400).json({
      message: "Ungültige Anfrage: taskId und goalId benötigt",
    });
  }

  try {
    const { db } = await connectToDatabase();
    const tasksCollection = db.collection("tasks");
    const goalsCollection = db.collection<GoalDocument>("goals");

    const goalObjectId = new ObjectId(goalId);
    const taskObjectId = new ObjectId(taskId);

    const goal = await goalsCollection.findOne({ _id: goalObjectId });
    if (!goal) {
      return res.status(404).json({ message: "Ziel nicht gefunden" });
    }

    const task = await tasksCollection.findOne({ _id: taskObjectId });
    if (!task) {
      return res.status(404).json({ message: "Aufgabe nicht gefunden" });
    }

    // goalId in der Aufgabe speichern
    await tasksCollection.updateOne(
      { _id: taskObjectId },
      { $set: { goalId, updatedAt: new Date().toISOString() } }
    );

    const alreadyLinked = Array.isArray(goal.tasks) && goal.tasks.includes(taskId);
    if (!alreadyLinked) {
      await goalsCollection.updateOne(
        { _id: goalObjectId },
        {
          $push: { tasks: taskId },
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
