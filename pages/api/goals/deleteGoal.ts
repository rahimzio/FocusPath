import { NextApiRequest, NextApiResponse } from "next";
import { connectToDatabase } from "../db/mongo";
import { ObjectId } from "mongodb";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "DELETE") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const { goalId, userId } = req.body;

  if (!goalId || !userId) {
    return res.status(400).json({ message: "Missing goalId or userId" });
  }

  try {
    const { db } = await connectToDatabase();
    const result = await db.collection("appData").deleteOne({
      _id: new ObjectId(goalId),
      userId,
      type: "goal",
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({ message: "Ziel nicht gefunden" });
    }

    return res.status(200).json({ message: "Ziel erfolgreich gelöscht" });
  } catch (error) {
    console.error("Fehler beim Löschen des Ziels:", error);
    return res.status(500).json({ message: "Interner Fehler" });
  }
}
