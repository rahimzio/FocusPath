import { NextApiRequest, NextApiResponse } from "next";
import { connectToDatabase } from "../db/mongo";
import { ObjectId } from "mongodb";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Only POST allowed" });
  }

  const { taskId, date, userId } = req.body;

  if (!taskId || !date || !userId) {
    return res.status(400).json({ message: "Missing taskId, date or userId" });
  }

  try {
    const { db } = await connectToDatabase();
    const appData = db.collection("appData");

    const updateResult = await appData.updateOne(
      { _id: new ObjectId(taskId), type: "task", userId },
      { $addToSet: { excludedDates: date } }
    );

    if (updateResult.modifiedCount === 0) {
      return res.status(404).json({ message: "Task not updated or not found" });
    }

    return res.status(200).json({ message: "Instance successfully excluded" });
  } catch (error) {
    console.error("❌ Fehler beim Ausschließen der Instanz:", error);
    return res.status(500).json({ message: "Server error", error });
  }
}
