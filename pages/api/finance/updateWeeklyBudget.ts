import type { NextApiRequest, NextApiResponse } from "next";
import { connectToDatabase } from "../db/mongo";
import { upsertFinance } from "@/lib/api/finance";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST" && req.method !== "PATCH") {
    return res.status(405).json({ message: "Use POST or PATCH." });
  }

  const { userId, week, budget } = req.body as { userId?: string; week?: string; budget?: number };
  if (!userId || !week || !(typeof budget === "number" && budget >= 0)) {
    return res.status(400).json({ message: "Missing/invalid userId/week/budget" });
  }

  try {
    const { db } = await connectToDatabase();
    await upsertFinance(
      db,
      { kind: "weekly_budget", userId, week },
      { kind: "weekly_budget", userId, week, budget },
      {}
    );
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error("updateWeeklyBudget", e);
    return res.status(500).json({ message: "Internal server error" });
  }
}
