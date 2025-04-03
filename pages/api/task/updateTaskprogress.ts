// api/tasks/updateTaskProgress.ts
import { NextApiRequest, NextApiResponse } from "next";
import { ObjectId } from "mongodb";
import { connectToDatabase } from "../db/mongo";
import { GoalDocument, TaskDocument } from "@/utils/interface";

function isValidObjectId(id: any): boolean {
  return typeof id === "string" && /^[a-f0-9]{24}$/.test(id);
}

// Fortschrittsberechnung für Ziele
async function calculateGoalProgress(goalId: string, db: any) {
  console.log("➡️ Starte Fortschrittsberechnung für goalId:", goalId);

  const goal = await db.collection("goals").findOne({ _id: new ObjectId(goalId) });
  if (!goal) {
    console.warn("⚠️ Ziel nicht gefunden für ID:", goalId);
    return 0;
  }

  let totalWeight = 0;
  let completedWeight = 0;

  const taskIds = (goal.tasks || []).filter(isValidObjectId).map((id: string) => new ObjectId(id));
  console.log("🧩 Valide Task-IDs im Ziel:", taskIds);

  const tasks = await db.collection("tasks").find({ _id: { $in: taskIds } }).toArray();
  tasks.forEach((task: TaskDocument) => {
    const w = task.weight || 1;
    totalWeight += w;
    if (task.status === "completed") {
      completedWeight += w;
    }
  });

  const subGoalIds = (goal.subGoals || []).filter(isValidObjectId).map((id: string) => new ObjectId(id));
  console.log("🧩 Valide SubGoal-IDs im Ziel:", subGoalIds);

  const subGoals = await db.collection("goals").find({ _id: { $in: subGoalIds } }).toArray();
  subGoals.forEach((sub: GoalDocument) => {
    const w = sub.weight || 1;
    totalWeight += w;
    completedWeight += (sub.progress / 100) * w;
  });

  const progress = totalWeight > 0 ? Math.round((completedWeight / totalWeight) * 100) : 0;
  console.log(`📊 Fortschritt für Ziel ${goalId}: ${progress}%`);

  await db.collection("goals").updateOne({ _id: new ObjectId(goalId) }, { $set: { progress } });

  return progress;
}

// API-Handler
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log("📥 POST /api/tasks/updateTaskProgress aufgerufen");

  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const { taskId, status, progress } = req.body;

  if (!isValidObjectId(taskId)) {
    console.warn("❌ Ungültige taskId erhalten:", taskId);
    return res.status(400).json({ message: "Ungültige taskId" });
  }

  try {
    const { db } = await connectToDatabase();
    const task = await db.collection("tasks").findOne({ _id: new ObjectId(taskId) });

    if (!task) {
      console.warn("❌ Aufgabe nicht gefunden:", taskId);
      return res.status(404).json({ message: "Aufgabe nicht gefunden" });
    }

    console.log("✅ Aufgabe gefunden:", task.name);

    const updates: Partial<TaskDocument> = {
      updatedAt: new Date().toISOString(),
    };

    if (typeof progress === "number") {
      updates.progress = progress;
      console.log("🔢 Neuer Progress-Wert:", progress);

      if (progress >= 100) {
        updates.status = "completed";
        console.log("🎯 Status automatisch auf 'completed' gesetzt (progress >= 100)");
      }
    }

    if (status) {
      updates.status = status;
      console.log("📝 Status manuell aktualisiert:", status);
    }

    await db.collection("tasks").updateOne({ _id: new ObjectId(taskId) }, { $set: updates });
    console.log("✅ Aufgabe erfolgreich in DB aktualisiert");

    // Fortschritt vom Ziel neu berechnen – auch bei nicht-validem ObjectId
    let resolvedGoalId: string | undefined;

    if (task.goalId) {
      if (isValidObjectId(task.goalId)) {
        resolvedGoalId = task.goalId;
      } else {
        // 🧠 Versuche, goalId als Ziel-Titel zu interpretieren
        const matchingGoal = await db.collection("goals").findOne({ title: task.goalId });
        if (matchingGoal?._id) {
          resolvedGoalId = matchingGoal._id.toString();
          console.log("🔁 Ungültige goalId korrigiert anhand Titel:", task.goalId, "→", resolvedGoalId);

          // 🔄 Update Aufgabe mit korrigierter goalId
          await db.collection("tasks").updateOne(
            { _id: new ObjectId(taskId) },
            { $set: { goalId: resolvedGoalId } }
          );
        } else {
          console.warn("⚠️ Kein Ziel gefunden für goalId (als Titel):", task.goalId);
        }
      }
    }

    if (resolvedGoalId) {
      const updatedProgress = await calculateGoalProgress(resolvedGoalId, db);
      console.log("✅ Ziel-Fortschritt erfolgreich neu berechnet:", updatedProgress);
      return res.status(200).json({
        message: "Aufgabe & Ziel aktualisiert",
        progress: updatedProgress,
        taskUpdated: true,
      });
    } else {
      console.log("ℹ️ Keine gültige oder auflösbare goalId vorhanden, Fortschrittsberechnung übersprungen.");
    }

    return res.status(200).json({ message: "Aufgabe aktualisiert", taskUpdated: true });
  } catch (err) {
    console.error("❌ Fehler beim Aktualisieren der Aufgabe:", err);
    return res.status(500).json({ message: "Fehler beim Aktualisieren der Aufgabe" });
  }
}
