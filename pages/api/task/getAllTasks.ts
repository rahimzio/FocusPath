import { NextApiRequest, NextApiResponse } from "next";
import { connectToDatabase } from "../db/mongo";
import { Task } from "@/utils/interface";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed. Use GET." });
  }

  try {
    const { userId } = req.query;

    if (!userId || typeof userId !== "string") {
      return res.status(400).json({ message: "Missing or invalid userId" });
    }

    const { db } = await connectToDatabase();
    const appData = db.collection<Task>("appData");

    const allTasks = await appData
      .find({ type: "task", userId })
      .sort({ dueDate: 1 }) // Optional: nach Fälligkeit sortieren
      .toArray();

    console.log("📋 Alle Tasks für Dashboard (User):", allTasks.length);

    return res.status(200).json({ tasks: allTasks });
  } catch (error) {
    console.error("❌ Fehler bei getAllTasks:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}
