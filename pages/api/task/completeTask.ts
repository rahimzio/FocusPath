// pages/api/task/completeTask.ts
import { NextApiRequest, NextApiResponse } from "next";
import { connectToDatabase } from "../db/mongo";
import { ObjectId } from "mongodb";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Nur POST-Requests erlauben
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed. Use POST." });
  }

  // Auslesen der benötigten Parameter aus dem Request-Body
  const { taskId, subTaskId, date } = req.body;
  if (!taskId || !date) {
    return res.status(400).json({ message: "Missing taskId or date." });
  }

  try {
    const { db } = await connectToDatabase();
    // Verwende die Collection, in der deine Tasks gespeichert werden
    const tasksColl = db.collection("tasks");

    // ────────────────────────────────────────────────
    // Fall 1: Es wurde eine subTaskId mitgegeben
    // ────────────────────────────────────────────────
    if (subTaskId) {
      // Update: Setze den Status der angegebenen Subtask auf "completed"
      const updateSubTaskResult = await tasksColl.updateOne(
        { _id: new ObjectId(taskId), "subTasks._id": subTaskId },
        { $set: { "subTasks.$.status": "completed" } }
      );
      console.log("Subtask update result:", updateSubTaskResult);

      // Lade die aktualisierte Hauptaufgabe, um zu prüfen, ob alle Subtasks abgeschlossen sind
      const taskDoc = await tasksColl.findOne({ _id: new ObjectId(taskId) });
      if (taskDoc && taskDoc.subTasks && Array.isArray(taskDoc.subTasks)) {
        const allSubTasksCompleted = taskDoc.subTasks.every((subTask: any) => subTask.status === "completed");
        if (allSubTasksCompleted) {
          // Falls alle Subtasks abgeschlossen sind, setze auch die Hauptaufgabe auf "completed"
          const updateTaskResult = await tasksColl.updateOne(
            { _id: new ObjectId(taskId) },
            { $set: { status: "completed" } }
          );
          console.log("Main task update result (all subtasks completed):", updateTaskResult);
        }
      }
      return res.status(200).json({ 
        message: "Subtask completed; main task updated if all subtasks are completed." 
      });
    }

    // ────────────────────────────────────────────────
    // Fall 2: Es wurde keine subTaskId mitgegeben → Hauptaufgabe abschließen
    // ────────────────────────────────────────────────
    const updateTaskResult = await tasksColl.updateOne(
      { _id: new ObjectId(taskId) },
      { $set: { status: "completed" } }
    );
    console.log("Main task update result:", updateTaskResult);
    return res.status(200).json({ message: "Main task completed." });
  } catch (error) {
    console.error("Fehler in completeTask:", error);
    return res.status(500).json({ message: "Serverfehler in completeTask" });
  }
}
