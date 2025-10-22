import { NextApiRequest, NextApiResponse } from "next";
import { ObjectId } from "mongodb";
import { connectToDatabase } from "../db/mongo";
import { TaskDocument } from "@/utils/interfaces/task";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "PUT") {
    return res.status(405).json({ message: "Method not allowed. Use PUT." });
  }

  try {
    const { taskId, userId } = req.query;
    const { time } = req.body;

    console.log("📦 Eingehende Daten:", req.body);

    // 🔍 Validierung
    if (!time || typeof time !== "string" || !time.includes(":")) {
      return res.status(400).json({ message: "Ungültiger Zeitwert" });
    }

    if (!taskId || typeof taskId !== "string" || !userId || typeof userId !== "string") {
      return res.status(400).json({ message: "Missing or invalid taskId or userId" });
    }

    const { db } = await connectToDatabase();
    const appData = db.collection<TaskDocument>("appData");

    const updateResult = await appData.updateOne(
      { _id: new ObjectId(taskId), type: "task", userId },
      { $set: { time, updatedAt: new Date().toISOString() } }
    );

    if (updateResult.modifiedCount === 0) {
      return res.status(404).json({ message: "Task not updated or not found" });
    }

    return res.status(200).json({ message: "Startzeit erfolgreich aktualisiert" });
  } catch (error) {
    console.error("❌ Error updating task time:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}
