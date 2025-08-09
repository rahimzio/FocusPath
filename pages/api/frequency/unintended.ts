import { NextApiRequest, NextApiResponse } from "next";
import { connectToDatabase } from "../db/mongo";
import { ActionLog } from "@/utils/interface";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const { userId, reason, taskId } = req.body as { userId?: string; reason?: string; taskId?: string };
  if (!userId) {
    return res.status(400).json({ message: "userId required" });
  }

  try {
    const { db } = await connectToDatabase();
    const collection = db.collection<ActionLog>("actionLogs");
    const date = new Date().toISOString().slice(0, 10);
    const log: Omit<ActionLog, "_id"> = {
        userId,
        date,
        typ: "unintended_action",
        meta: { reason, taskId },
        createdAt: new Date().toISOString(),
        FileType2Icon: "action_log",
        logType: "unintended_action"
    };
    const result = await collection.insertOne(log as unknown as ActionLog);
    return res.status(201).json({ id: result.insertedId });
  } catch (err) {
    console.error("Failed to log unintended action", err);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}