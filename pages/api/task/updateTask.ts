// pages/api/task/updateTask.ts
import { NextApiRequest, NextApiResponse } from "next";
import { ObjectId } from "mongodb";
import { connectToDatabase, disconnectFromDatabase } from "../db/mongo";
import { Task } from "@/utils/interface";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Erlaube nur PUT
  if (req.method !== "PUT") {
    return res.status(405).json({ message: "Method not allowed. Use PUT." });
  }

  try {
    // 1) Hole taskId aus der Query
    const { taskId } = req.query;
    if (!taskId || typeof taskId !== "string") {
      return res.status(400).json({ message: "Missing or invalid taskId parameter" });
    }

    // 2) Neue Felder aus dem Body
    //    Du kannst *alle* Felder annehmen, oder gezielt name, description, etc.
    const updateFields = req.body as Partial<Task>;
    updateFields.updatedAt = new Date().toISOString();

    // 3) DB-Verbindung
    const { db } = await connectToDatabase();
    const tasksColl = db.collection<Task>("tasks");

    // 4) Update
    const result = await tasksColl.updateOne(
      { _id: new ObjectId(taskId) },
      { $set: updateFields }
    );

    await disconnectFromDatabase();

    if (result.modifiedCount === 0) {
      return res.status(404).json({ message: "Task not found or not updated" });
    }

    return res.status(200).json({ message: "Task updated successfully" });
  } catch (error) {
    console.error("Error updating task:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}
