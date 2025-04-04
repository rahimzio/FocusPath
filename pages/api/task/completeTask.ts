// pages/api/task/completeTask.ts
import { NextApiRequest, NextApiResponse } from "next";
import { connectToDatabase } from "../db/mongo";
import { ObjectId } from "mongodb";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed. Use POST." });
  }

  const { taskId, subTaskId, date } = req.body;
  if (!taskId || !date) {
    return res.status(400).json({ message: "Missing taskId or date." });
  }

  try {
    const { db } = await connectToDatabase();
    const tasksColl = db.collection("tasks");
    const completionsColl = db.collection("completions");

    // 🔹 Subtask-Komplettierung
    if (subTaskId) {
      const updateSubTaskResult = await tasksColl.updateOne(
        { _id: new ObjectId(taskId), "subTasks._id": subTaskId },
        { $set: { "subTasks.$.status": "completed" } }
      );
      console.log("✅ Subtask update result:", updateSubTaskResult);

      const taskDoc = await tasksColl.findOne({ _id: new ObjectId(taskId) });
      const allCompleted = taskDoc?.subTasks?.every((st: any) => st.status === "completed");

      if (allCompleted) {
        // Wenn alle Subtasks erledigt sind → Completion schreiben
        await completionsColl.updateOne(
          { taskId, date },
          { $set: { status: "completed" } },
          { upsert: true }
        );
        console.log("✅ Completion eingetragen für vollständige Subtasks");
      }

      return res.status(200).json({ message: "Subtask abgeschlossen." });
    }

    // 🔹 Hauptaufgabe ohne Subtasks abschließen
    // → Speichere den Status nur in completions, nicht mehr direkt im Task-Dokument
    const completionResult = await completionsColl.updateOne(
      { taskId, date },
      { $set: { status: "completed" } },
      { upsert: true }
    );
    console.log("✅ Completion für Hauptaufgabe gespeichert:", completionResult);

    return res.status(200).json({ message: "Task completion gespeichert." });
  } catch (error) {
    console.error("❌ Fehler in completeTask:", error);
    return res.status(500).json({ message: "Serverfehler in completeTask" });
  }
}
