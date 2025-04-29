// pages/api/task/completeTask.ts

import { NextApiRequest, NextApiResponse } from "next";
import { connectToDatabase } from "../db/mongo";
import { ObjectId } from "mongodb";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log("📥 Neue Anfrage bei /api/task/completeTask:", req.method);

  if (req.method !== "POST") {
    console.warn("❌ Ungültige Methode:", req.method);
    return res.status(405).json({ message: "Method not allowed. Use POST." });
  }

  const { taskId, subTaskId, date, userId } = req.body;
  console.log("📨 Request Body:", { taskId, subTaskId, date, userId });

  if (!taskId || !date || !userId) {
    console.warn("⚠️ Fehlende Pflichtfelder", { taskId, date, userId });
    return res.status(400).json({ message: "Missing required fields: taskId, date, or userId." });
  }

  try {
    const { db } = await connectToDatabase();
    const appData = db.collection("appData");
    console.log("🧭 Datenbankverbindung hergestellt, verwende Collection: appData");

    // 🔹 Subtask abschließen
    if (subTaskId) {
      console.log("🛠 Versuche Subtask abzuschließen:", subTaskId);

      const updateResult = await appData.updateOne(
        { _id: new ObjectId(taskId), type: "task", userId, "subTasks._id": subTaskId },
        { $set: { "subTasks.$.status": "completed" } }
      );

      console.log("🔄 Update-Ergebnis Subtask:", updateResult);

      const taskDoc = await appData.findOne({ _id: new ObjectId(taskId), type: "task", userId });
      if (!taskDoc) {
        console.error("❌ Task nicht gefunden mit ID:", taskId);
        return res.status(404).json({ message: "Task nicht gefunden" });
      }

      const allCompleted = taskDoc?.subTasks?.every((st: any) => st.status === "completed");
      console.log("📊 Subtasks vollständig?", allCompleted);

      if (allCompleted) {
        const completeResult = await appData.updateOne(
          { type: "completion", taskId, date, userId: userId.toString() },
          { $set: { status: "completed" } },
          { upsert: true }
        );
        console.log("✅ Alle Subtasks erledigt → Completion gespeichert:", completeResult);
      }

      return res.status(200).json({ message: "Subtask abgeschlossen." });
    }

    // 🔹 Hauptaufgabe abschließen
    console.log("🛠 Versuche Hauptaufgabe abzuschließen:", taskId);

    const result = await appData.updateOne(
      { type: "completion", taskId, date, userId },
      { $set: { status: "completed" } },
      { upsert: true }
    );

    console.log("✅ Completion für Hauptaufgabe gespeichert:", result);
    return res.status(200).json({ message: "Aufgabe abgeschlossen." });
  } catch (error) {
    console.error("❌ Fehler in completeTask:", error);
    return res.status(500).json({ message: "Serverfehler in completeTask" });
  }
}
