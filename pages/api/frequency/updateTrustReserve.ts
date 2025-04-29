// pages/api/trustReserve/update.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { connectToDatabase } from "../db/mongo";
import { ObjectId } from "mongodb";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Nur POST erlaubt" });
  }

  const { userId, delta, details } = req.body;

  if (!userId || typeof delta !== "number" || !Array.isArray(details)) {
    return res.status(400).json({ message: "Ungültige Daten" });
  }

  try {
    const {db} = await connectToDatabase();
    const users = db.collection("users");

    // Hole aktuellen Stand
    const user = await users.findOne({ _id: new ObjectId(userId) });
    const current = user?.trustReserve?.current ?? 50; // Startwert falls nicht gesetzt

    const newValue = Math.max(0, Math.min(100, current + delta)); // Clamp zw. 0 und 100

    const newHistoryEntry = {
      date: new Date().toISOString(),
      delta,
      details,
    };

    const update = {
      $set: { "trustReserve.current": newValue },
      $push: { "trustReserve.history": newHistoryEntry },
    };

    await users.updateOne({ _id: new ObjectId(userId) }, update);

    return res.status(200).json({
      message: "Trust Reserve aktualisiert",
      newValue,
    });
  } catch (error) {
    console.error("TrustReserve update error:", error);
    return res.status(500).json({ message: "Serverfehler" });
  }
}
