import { NextApiRequest, NextApiResponse } from "next";
import { connectToDatabase } from "../db/mongo";
import { ObjectId } from "mongodb";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "DELETE") {
    return res.status(405).json({ message: "Method Not Allowed. Use DELETE." });
  }

  try {
    const { taskId, userId } = req.query;

    if (!taskId || typeof taskId !== "string" || !userId || typeof userId !== "string") {
      return res.status(400).json({ message: "Missing or invalid taskId or userId" });
    }

    const { db } = await connectToDatabase();
    const appData = db.collection("appData");

    // 1) Task löschen
    const deleteResult = await appData.deleteOne({
      _id: new ObjectId(taskId),
      type: "task",
      userId,
    });

    // 2) Zuordnungen in completions löschen
    await appData.deleteMany({
      type: "completion",
      taskId,
      userId,
    });

    if (deleteResult.deletedCount === 1) {
      return res.status(200).json({ message: "Task deleted successfully" });
    } else {
      return res.status(404).json({ message: "Task not found or not authorized" });
    }
  } catch (error) {
    console.error("❌ Fehler beim Löschen der Aufgabe:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}
