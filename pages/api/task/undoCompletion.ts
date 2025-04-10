import { NextApiRequest, NextApiResponse } from "next";
import { connectToDatabase } from "../db/mongo";
import { ObjectId } from "mongodb";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed. Use POST." });
  }

  const { taskId, subTaskId, date, userId } = req.body;

  if (!taskId || !date || !userId) {
    return res.status(400).json({ message: "Missing taskId, date or userId." });
  }

  try {
    const { db } = await connectToDatabase();
    const appData = db.collection("appData");

    // 🔹 Ein einzelner Subtask wird zurückgesetzt
    if (subTaskId) {
      const updateSubTaskResult = await appData.updateOne(
        { _id: new ObjectId(taskId), type: "task", userId, "subTasks._id": subTaskId },
        { $set: { "subTasks.$.status": "incomplete" } }
      );
      console.log("🔄 Subtask wieder offen:", updateSubTaskResult);
    } else {
      // 🔹 Hauptaufgabe wird zurückgesetzt
      // 1) Completion löschen
      const deleteCompletion = await appData.deleteOne({
        type: "completion",
        userId,
        taskId,
        date,
      });
      console.log("🗑️ Completion-Eintrag gelöscht:", deleteCompletion.deletedCount);

      // 2) Subtasks (falls vorhanden) auf "incomplete" setzen
      const resetSubtasks = await appData.updateOne(
        { _id: new ObjectId(taskId), type: "task", userId },
        { $set: { "subTasks.$[].status": "incomplete" } }
      );
      console.log("🔄 Alle Subtasks zurückgesetzt:", resetSubtasks.modifiedCount);
    }

    return res.status(200).json({ message: "Task reset successful" });
  } catch (error) {
    console.error("❌ Fehler in undoCompletion:", error);
    return res.status(500).json({ message: "Serverfehler in undoCompletion" });
  }
}
