import { NextApiRequest, NextApiResponse } from "next";
import { connectToDatabase } from "../db/mongo";
import { ObjectId } from "mongodb";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Only POST allowed" });
  }

  const { taskId, date } = req.body;
  if (!taskId || !date) {
    return res.status(400).json({ message: "Missing taskId or date" });
  }

  try {
    const { db } = await connectToDatabase();
    const tasksColl = db.collection("tasks");

    const updateResult = await tasksColl.updateOne(
      { _id: new ObjectId(taskId) },
      { $addToSet: { excludedDates: date } } // neue Eigenschaft hinzufügen
    );

    if (updateResult.modifiedCount === 0) {
      return res.status(404).json({ message: "Task not updated or not found" });
    }

    return res.status(200).json({ message: "Instance successfully excluded" });
  } catch (error) {
    console.error("Fehler beim Ausschließen der Instanz:", error);
    return res.status(500).json({ message: "Server error", error });
  }
}
