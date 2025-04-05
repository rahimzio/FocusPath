// pages/api/goal/getGoals.ts

import { NextApiRequest, NextApiResponse } from "next";
import { connectToDatabase } from "../db/mongo";
import { Goal } from "@/utils/interface";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed. Use GET." });
  }

  try {
    const { db } = await connectToDatabase();

    // Prüfen, ob die Collection existiert (Vermeidung von CosmosDB RU-Problemen)
    const collections = await db.listCollections({}, { nameOnly: true }).toArray();
    const collectionExists = collections.some((col) => col.name === "goals");

    if (!collectionExists) {
      return res.status(500).json({
        message: "Collection 'goals' existiert nicht. Bitte zuerst manuell anlegen.",
        goals: [],
      });
    }

    const goalsColl = db.collection<Goal>("goals");
    const allGoals = await goalsColl.find({}).toArray();

    console.log("✅ Ziele geladen:", allGoals.length);
    return res.status(200).json({ goals: allGoals });
  } catch (error) {
    console.error("❌ Fehler bei getGoals:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}
