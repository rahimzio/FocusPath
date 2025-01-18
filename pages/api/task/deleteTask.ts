// pages/api/task/deleteTask.ts
import { NextApiRequest, NextApiResponse } from "next";
import { connectToDatabase, disconnectFromDatabase } from "../db/mongo";
import { ObjectId } from "mongodb";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "DELETE") {
    return res.status(405).json({ message: "Method Not Allowed. Use DELETE." });
  }

  try {
    // Query-Parameter z. B. ?taskId=...
    const { taskId } = req.query;
    if (!taskId || typeof taskId !== "string") {
      return res.status(400).json({ message: "Missing or invalid taskId parameter" });
    }

    const { db } = await connectToDatabase();

    // 1) Task-Dokument löschen (Tasks-Collection)
    const tasksColl = db.collection("tasks");
    const deleteResult = await tasksColl.deleteOne({ _id: new ObjectId(taskId) });

    // 2) Optional: Auch in `completions` entfernen
    //   Wenn du willst, dass sämtliche Einträge in `completions` (z. B. bei daily) verschwinden:
    const completionsColl = db.collection("completions");
    await completionsColl.deleteMany({ taskId });

    await disconnectFromDatabase();

    if (deleteResult.deletedCount === 1) {
      return res.status(200).json({ message: "Task deleted successfully" });
    } else {
      return res.status(404).json({ message: "Task not found" });
    }
  } catch (error) {
    console.error("Fehler beim Löschen der Aufgabe:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}
