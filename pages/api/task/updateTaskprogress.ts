// api/tasks/updateTaskProgress.ts
import { NextApiRequest, NextApiResponse } from "next";
import { ObjectId } from "mongodb";
import { connectToDatabase } from "../db/mongo";
import { GoalDocument, TaskDocument } from "@/utils/interface";

// Fortschritt des Ziels neu berechnen
async function calculateGoalProgress(goalId: string, db: any) {
  const goal = await db.collection("goals").findOne({ _id: new ObjectId(goalId) });
  if (!goal) return 0;

  let totalWeight = 0;
  let completedWeight = 0;

  if (goal.tasks.length > 0) {
    const tasks = await db.collection("tasks").find({ _id: { $in: goal.tasks.map((id: string) => new ObjectId(id)) } }).toArray();
    tasks.forEach((task: TaskDocument) => {
      totalWeight += task.weight || 1;
      if (task.status === "completed") {
        completedWeight += task.weight || 1;
      }
    });
  }

  if (goal.subGoals.length > 0) {
    const subGoals = await db.collection("goals").find({ _id: { $in: goal.subGoals.map((id: string) => new ObjectId(id)) } }).toArray();
    subGoals.forEach((subGoal: GoalDocument) => {
      totalWeight += subGoal.weight || 1;
      completedWeight += (subGoal.progress / 100) * (subGoal.weight || 1);
    });
  }

  const progress = totalWeight > 0 ? Math.round((completedWeight / totalWeight) * 100) : 0;
  await db.collection("goals").updateOne({ _id: new ObjectId(goalId) }, { $set: { progress } });
  return progress;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const { taskId, status } = req.body;
    if (!taskId || !status) {
      return res.status(400).json({ message: "taskId und status sind erforderlich" });
    }

    const { db } = await connectToDatabase();
    const task = await db.collection("tasks").findOne({ _id: new ObjectId(taskId) });
    if (!task) {
      return res.status(404).json({ message: "Aufgabe nicht gefunden" });
    }

    await db.collection("tasks").updateOne({ _id: new ObjectId(taskId) }, { $set: { status } });
    
    if (task.goalId) {
      const updatedProgress = await calculateGoalProgress(task.goalId, db);
      return res.status(200).json({ message: "Aufgabe aktualisiert", progress: updatedProgress });
    }

    return res.status(200).json({ message: "Aufgabe aktualisiert" });
  } catch (error) {
    console.error("Fehler beim Aktualisieren der Aufgabe:", error);
    return res.status(500).json({ message: "Fehler beim Aktualisieren der Aufgabe" });
  }
}
