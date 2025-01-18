// api/goal/getGoals.ts
import { NextApiRequest, NextApiResponse } from "next";
import { connectToDatabase, disconnectFromDatabase } from "../db/mongo"; 
import { Goal } from "@/utils/interface";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed. Use GET." });
  }

  try {
    const { db } = await connectToDatabase();
    const collection = db.collection<Goal>("goals");

    const goals = await collection.find({}).toArray(); // alle Goals
    await disconnectFromDatabase();

    // Sende ein Objekt mit goals-Array zurück
    return res.status(200).json({ goals });
  } catch (error) {
    console.error("Fehler beim Abrufen der Ziele:", error);
    return res.status(500).json({ message: "Interner Serverfehler" });
  }
}

