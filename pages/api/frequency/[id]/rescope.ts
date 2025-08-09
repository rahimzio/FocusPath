import { NextApiRequest, NextApiResponse } from "next";
import { ObjectId } from "mongodb";
import { connectToDatabase } from "../../db/mongo";
import { recalcDailyScores } from "@/utils/metrcis/recalcDailyScores";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "PATCH") {
    return res.status(405).json({ message: "Method not allowed. Use PATCH." });
  }

  const { id } = req.query;
  const { userId } = req.body;
  if (!id || !userId) {
    return res.status(400).json({ message: "Missing id or userId" });
  }

  try {
    const { db } = await connectToDatabase();
    const appData = db.collection("appData");
    const _id = new ObjectId(String(id));

    const commitment = await appData.findOne({ _id, type: "commitment", userId });
    if (!commitment) {
      return res.status(404).json({ message: "Commitment not found" });
    }

    if (commitment.status !== "open") {
      return res.status(400).json({ message: "Commitment not open" });
    }

    const rescopedAt = new Date().toISOString();

    await appData.updateOne({ _id }, { $set: { status: "rescoped", rescopedAt } });

    // log action
    await appData.insertOne({
      type: "action_log",
      userId,
      date: commitment.dueDate,
      logType: "commitment_rescoped",
      meta: { weight: commitment.weight },
      createdAt: rescopedAt,
    });

    await recalcDailyScores(userId, commitment.dueDate);

    return res.status(200).json({ message: "Commitment rescoped" });
  } catch (err: any) {
    console.error("Error rescoping commitment", err);
    return res.status(500).json({ message: "Internal server error" });
  }
}