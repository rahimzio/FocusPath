// api/goals/updateGoalProgress.ts
import { NextApiRequest, NextApiResponse } from "next";
import { ObjectId } from "mongodb";
import { connectToDatabase } from "../db/mongo";
import { GoalDocument, TaskDocument } from "@/utils/interface";

// Funktion zur Berechnung des Fortschritts basierend auf Aufgaben & Unterzielen
async function calculateGoalProgress(goalId: string, db: any) {
  const goal = await db.collection("goals").findOne({ _id: new ObjectId(goalId) });
  if (!goal) return 0;

  let totalWeight = 0;
  let completedWeight = 0;

  // Berechnung des Fortschritts aus den Aufgaben
  if (goal.tasks.length > 0) {
    const tasks = await db.collection("tasks").find({ _id: { $in: goal.tasks.map((id: string) => new ObjectId(id)) } }).toArray();
    tasks.forEach((task: TaskDocument) => {
      totalWeight += task.weight || 1;
      if (task.status === "completed") {
        completedWeight += task.weight || 1;
      }
    });
  }

  // Berechnung des Fortschritts aus den Unterzielen
  if (goal.subGoals.length > 0) {
    const subGoals = await db.collection("tasks").find({ _id: { $in: goal.tasks.map((id: string) => new ObjectId(id)) } }).toArray();
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
    const { goalId } = req.body;
    if (!goalId) {
      return res.status(400).json({ message: "goalId erforderlich" });
    }

    const { db } = await connectToDatabase();
    const updatedProgress = await calculateGoalProgress(goalId, db);

    return res.status(200).json({ message: "Fortschritt aktualisiert", progress: updatedProgress });
  } catch (error) {
    console.error("Fehler bei der Fortschrittsberechnung:", error);
    return res.status(500).json({ message: "Fehler bei der Fortschrittsberechnung" });
  }
}
