import type { NextApiRequest, NextApiResponse } from "next";
import { connectToDatabase } from "../db/mongo";
import { FINANCE_COLLECTION } from "@/lib/api/finance";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ message: "Use POST." });
  const { userId, goalId, delta, date, note } = req.body || {};
  if (!userId || !goalId || typeof delta !== "number" || !isFinite(delta) || !date) {
    return res.status(400).json({ message: "Missing/invalid userId/goalId/delta/date" });
  }

  try {
    const { db } = await connectToDatabase();
    const goals = db.collection(FINANCE_COLLECTION);

    const goal = await goals.findOne({ _id: new (require("mongodb").ObjectId)(goalId), kind: "saving_goal", userId });
    if (!goal) return res.status(404).json({ message: "Ziel nicht gefunden" });

    const current = Number(goal.currentAmount ?? 0);
    const next = current + delta;
    if (next < 0) return res.status(400).json({ message: "Abhebung größer als aktueller Betrag" });

    // 1) Transaktion loggen
    await goals.insertOne({
      kind: "saving_goal_txn",
      userId,
      goalId: goalId,
      delta,
      date: new Date(date).toISOString(),
      note: (note ?? "").toString().trim() || null,
      createdAt: new Date().toISOString(),
    });

    // 2) Ziel aktualisieren
    await goals.updateOne(
      { _id: new (require("mongodb").ObjectId)(goalId) },
      { $set: { currentAmount: next, updatedAt: new Date().toISOString() } }
    );

    return res.status(200).json({ ok: true, currentAmount: next });
  } catch (e) {
    console.error("updateSavingGoal", e);
    res.status(500).json({ message: "Internal server error" });
  }
}
