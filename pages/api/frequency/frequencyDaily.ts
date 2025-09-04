
import type { NextApiRequest, NextApiResponse } from "next";
import { connectToDatabase } from "../db/connectToDatabase";
import { ObjectId } from "mongodb";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ message: "Nur GET erlaubt" });

  const { userId } = req.query as { userId?: string };
  if (!userId) return res.status(400).json({ message: "userId fehlt" });

  try {
    const { db } = await connectToDatabase();
    const uid = new ObjectId(userId);

    const tasks = await db
      .collection("tasks")
      .find({ userId: uid, frequency: "daily", isFrequencyTask: true })
      .project({ name: 1, points: 1, isDont: 1 })
      .toArray();

    const dos = tasks.filter(t => !t.isDont).map(t => ({ name: t.name, points: t.points ?? 1 }));
    const donts = tasks.filter(t => !!t.isDont).map(t => ({ name: t.name, points: t.points ?? 1 }));

    res.status(200).json({ ok: true, dos, donts });
  } catch (e: any) {
    console.error(e);
    res.status(500).json({ ok: false, error: e.message });
  }
}