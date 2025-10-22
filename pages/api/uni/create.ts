import { NextApiRequest, NextApiResponse } from "next";
import { connectToDatabase } from "../db/mongo";
import { ObjectId } from "mongodb";
import { OnlineModule } from "@/utils/interfaces/task";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed. Use POST." });
  }

  const { userId, title, description, startDate, endDate, chapters = [], linkedTasks = [] } = req.body as Partial<OnlineModule>;

  if (!userId || !title || !Array.isArray(chapters) || chapters.length === 0) {
    return res.status(400).json({ message: "Missing required fields" });
  }
  if (chapters.some(c => !Array.isArray(c.units) || c.units.length === 0)) {
    return res.status(400).json({ message: "Each chapter needs at least one unit" });
  }

  const totalUnits = chapters.reduce((a,c)=>a+c.units.length,0);
  const completedUnits = chapters.reduce((a,c)=>a+c.units.filter(u=>u.status==="completed").length,0);

  try {
    const { db } = await connectToDatabase();
    const appData = db.collection("appData");

    const _id = new ObjectId();
    const createdAt = new Date().toISOString();

    const doc = {
      _id,
      type: "module",
      userId,
      title,
      description: description || "",
      chapters,
      startDate,
      endDate,
      linkedTasks,
      totalUnits,
      completedUnits,
      createdAt,
      updatedAt: createdAt
    };

    await appData.insertOne(doc);

    return res.status(201).json({ moduleId: _id.toString() });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Internal server error" });
  }
}