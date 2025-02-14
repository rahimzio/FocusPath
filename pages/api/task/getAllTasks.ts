// pages/api/task/getAllTasks.ts
import { NextApiRequest, NextApiResponse } from "next";
import { connectToDatabase, disconnectFromDatabase } from "../db/mongo";
import { Task } from "@/utils/interface"; 

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed. Use GET." });
  }

  try {
    const { db } = await connectToDatabase();
    const tasksColl = db.collection<Task>("tasks");

    const allTasks = await tasksColl.find({}).toArray();
    console.log("Alle Tasks für Dashboard:", allTasks);

    await disconnectFromDatabase();
    return res.status(200).json({ tasks: allTasks });
  } catch (error) {
    console.error("Fehler bei getAllTasks:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}
