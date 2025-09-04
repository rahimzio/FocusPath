import { NextApiRequest, NextApiResponse } from "next";
import { ObjectId } from "mongodb";
import { connectToDatabase } from "../db/mongo";
import { TaskDocument } from "@/utils/interface";
import { recalcGoalProgress } from "@/lib/server/recalcGoalProgress";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "PUT") {
    return res.status(405).json({ message: "Method not allowed. Use PUT." });
  }

  try {
    const { taskId, userId } = req.query;
    console.log("📦 Eingehende Daten:", req.body);

    if (!taskId || typeof taskId !== "string" || !userId || typeof userId !== "string") {
      return res.status(400).json({ message: "Missing or invalid taskId or userId" });
    }

    const {
      name,
      description,
      points,
      color,
      duration,
      dueDate,
      time,
      frequency,
      category,
      timebased,
       daysOfWeek,
      interval,
    } = req.body;

    const updateFields: Partial<TaskDocument> = {
      name,
      description,
      points,
      color,
      duration,
      dueDate,
      time,
      frequency,
      category,
      timebased,
      updatedAt: new Date().toISOString(),
       daysOfWeek,
      interval,
    };

    const { db } = await connectToDatabase();
    const tasksColl = db.collection<TaskDocument>("appData");

     const result = await tasksColl.updateOne(
    { _id: new ObjectId(taskId), userId, type: "task" },
    { $set: updateFields }
  );
  console.log("📤 update result", {
    modifiedCount: result.modifiedCount,
    updateFields,
  });

await recalcGoalProgress((req as any).body?.goalId);

    if (result.modifiedCount === 0) {
      return res.status(404).json({ message: "Task not found or not updated" });
    }

    return res.status(200).json({ message: "Task updated successfully" });
  } catch (error) {
    console.error("❌ Error updating task:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}
