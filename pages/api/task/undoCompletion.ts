// pages/api/task/undoCompletion.ts
import { NextApiRequest, NextApiResponse } from "next";
import { connectToDatabase, disconnectFromDatabase } from "../db/mongo";
import { Completion } from "@/utils/interface";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed. Use POST." });
  }

  const { taskId, date } = req.body;
  console.log(`undoCompletion API aufgerufen mit: taskId=${taskId}, date=${date}`);
  if (!taskId || !date) {
    return res.status(400).json({ message: "Missing taskId or date." });
  }

  try {
    const { db } = await connectToDatabase();
    const completionsColl = db.collection<Completion>("completions");

    // Update status => "incomplete"
    const updateResult = await completionsColl.updateOne(
      { taskId, date },
      { $set: { status: "incomplete" } },
      { upsert: true }
    );

    console.log(`UpdateResult von undoCompletion:`, updateResult);

    await disconnectFromDatabase();
    return res.status(200).json({ message: "Task set to incomplete." });
  } catch (error) {
    console.error("Fehler in undoCompletion:", error);
    return res.status(500).json({ message: "Serverfehler in undoCompletion" });
  }
}
