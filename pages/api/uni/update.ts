import { NextApiRequest, NextApiResponse } from "next";
import { connectToDatabase } from "../db/mongo";
import { ObjectId } from "mongodb";
import { OnlineModule } from "@/utils/interfaces/task";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "PUT") {
    return res.status(405).json({ message: "Method not allowed. Use PUT." });
  }

  const { moduleId, userId } = req.query;
  if (!moduleId || typeof moduleId !== "string" || !userId || typeof userId !== "string") {
    return res.status(400).json({ message: "Missing moduleId or userId" });
  }

  const updated = req.body as OnlineModule;
  const totalUnits = updated.chapters.reduce((a,c)=>a+c.units.length,0);
  const completedUnits = updated.chapters.reduce((a,c)=>a+c.units.filter(u=>u.status==="completed").length,0);

  try {
    const { db } = await connectToDatabase();
    await db.collection("appData").updateOne(
      { _id: new ObjectId(moduleId), type: "module", userId },
      { $set: { ...updated, totalUnits, completedUnits, updatedAt: new Date().toISOString() } }
    );
    return res.status(200).json({ message: "updated" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Internal server error" });
  }
}