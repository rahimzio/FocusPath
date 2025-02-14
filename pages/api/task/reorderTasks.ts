// pages/api/task/reorderTasks.ts
import { NextApiRequest, NextApiResponse } from "next";
import { connectToDatabase, disconnectFromDatabase } from "../db/mongo";
import { Task } from "@/utils/interface"; 

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed. Use POST." });
  }

  const { frequency, taskIds } = req.body;

  if (!frequency || !Array.isArray(taskIds)) {
    return res.status(400).json({ message: "Missing 'frequency' or 'taskIds' in request body." });
  }

  try {
    const { db } = await connectToDatabase();
    const tasksColl = db.collection<Task>("tasks");

    const bulkOps = taskIds.map((taskId: string, index: number) => ({
      updateOne: {
        filter: { _id: taskId },
        update: { $set: { order: index } },
      },
    }));

    await tasksColl.bulkWrite(bulkOps);
    console.log(`Reihenfolge für frequency '${frequency}' aktualisiert.`);
    
    await disconnectFromDatabase();
    return res.status(200).json({ message: "Reihenfolge erfolgreich aktualisiert." });
  } catch (error) {
    console.error("Fehler beim Reorden der Tasks:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}
