import type { NextApiRequest, NextApiResponse } from "next";
import { connectToDatabase } from "../db/mongo";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { userId, from, to } = req.query;
    if (!userId || typeof userId !== "string") {
      return res.status(400).json({ error: "userId fehlt" });
    }

    const { db } = await connectToDatabase();
    const col = db.collection("frequency");

    const filter: any = { userId };
    if (typeof from === "string" && typeof to === "string") {
      filter.date = { $gte: from, $lte: to };
    }

    const snapshots = await col.find(filter).sort({ date: 1 }).toArray();
    // Mappe ggf. auf dein Chart-Interface
    return res.status(200).json({ snapshots });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Serverfehler" });
  }
}
