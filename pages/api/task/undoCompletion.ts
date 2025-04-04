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

    // 🔹 Ein einzelner Subtask wird zurückgesetzt
    if (subTaskId) {
      const updateSubTaskResult = await tasksColl.updateOne(
        { _id: new ObjectId(taskId), "subTasks._id": subTaskId },
        { $set: { "subTasks.$.status": "incomplete" } }
      );
      console.log("🔄 Subtask wieder offen:", updateSubTaskResult);
    } else {
      // 🔹 Hauptaufgabe wird zurückgesetzt
      //    → auch alle Subtasks (falls vorhanden) werden auf "incomplete" gesetzt
      await completionsColl.deleteOne({ taskId, date });
      console.log("🗑️ Completion-Eintrag gelöscht");

      // Setze Subtasks (falls vorhanden) auf "incomplete"
      const resetAllSubtasks = await tasksColl.updateOne(
        { _id: new ObjectId(taskId) },
        { $set: { "subTasks.$[].status": "incomplete" } } // $[] → alle Elemente im Array
      );
      console.log("🔄 Alle Subtasks zurückgesetzt:", resetAllSubtasks);
    }

    return res.status(200).json({ message: "Task reset successful" });
  } catch (error) {
    console.error("❌ Fehler in undoCompletion:", error);
    return res.status(500).json({ message: "Serverfehler in undoCompletion" });
  }
}
