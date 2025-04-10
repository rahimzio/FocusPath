import { NextApiRequest, NextApiResponse } from "next";
import { connectToDatabase } from "../db/mongo";
import { ObjectId } from "mongodb";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed. Use POST." });
  }

  const { taskId, subTaskId, date, userId } = req.body;

  if (!taskId || !date || !userId) {
    return res.status(400).json({ message: "Missing required fields: taskId, date, or userId." });
  }

  try {
    const { db } = await connectToDatabase();
    const appData = db.collection("appData");

    // 🔹 Subtask abschließen
    if (subTaskId) {
      const updateResult = await appData.updateOne(
        { _id: new ObjectId(taskId), type: "task", userId, "subTasks._id": subTaskId },
        { $set: { "subTasks.$.status": "completed" } }
      );
      console.log("✅ Subtask update result:", updateResult.modifiedCount);

      // Hole Task erneut, prüfe ob alle Subtasks erledigt
      const taskDoc = await appData.findOne({ _id: new ObjectId(taskId), type: "task", userId });
      const allCompleted = taskDoc?.subTasks?.every((st: any) => st.status === "completed");

      if (allCompleted) {
        await appData.updateOne(
          { type: "completion", taskId, date, userId },
          { $set: { status: "completed" } },
          { upsert: true }
        );
        console.log("✅ Alle Subtasks erledigt → Completion geschrieben");
      }

      return res.status(200).json({ message: "Subtask abgeschlossen." });
    }

    // 🔹 Hauptaufgabe abschließen (ohne Subtasks)
    const result = await appData.updateOne(
      { type: "completion", taskId, date, userId },
      { $set: { status: "completed" } },
      { upsert: true }
    );
    console.log("✅ Completion für Hauptaufgabe gespeichert:", result.upsertedId || result.modifiedCount);

    return res.status(200).json({ message: "Aufgabe abgeschlossen." });
  } catch (error) {
    console.error("❌ Fehler in completeTask:", error);
    return res.status(500).json({ message: "Serverfehler in completeTask" });
  }
}
