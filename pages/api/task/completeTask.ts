// pages/api/task/completeTask.ts
import { NextApiRequest, NextApiResponse } from "next";
import { connectToDatabase } from "../db/mongo";
import { Completion } from "@/utils/interface";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed. Use POST." });
  }

  const { taskId, date } = req.body;
  if (!taskId || !date) {
    return res.status(400).json({ message: "Missing taskId or date." });
  }

  try {
    const { db } = await connectToDatabase();
    const completionsColl = db.collection<Completion>("completions");

    // Upsert: Falls (taskId, date) schon existiert => aktualisieren
    const updateResult = await completionsColl.updateOne(
      { taskId, date },
      { $set: { status: "completed" } },
      { upsert: true }
    );

    console.log(`UpdateResult von completeTask:`, updateResult);

    return res.status(200).json({ message: "Task completed for that date." });
  } catch (error) {
    console.error("Fehler in completeTask:", error);
    return res.status(500).json({ message: "Serverfehler in completeTask" });
  }
}
