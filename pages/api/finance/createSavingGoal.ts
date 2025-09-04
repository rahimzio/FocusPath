import type { NextApiRequest, NextApiResponse } from "next";
import { connectToDatabase } from "../db/mongo";
import { insertFinance, nowISO } from "@/lib/api/finance";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ message: "Use POST." });

  const RID = Math.random().toString(36).slice(2, 8);
  const DEBUG = String(process.env.DEBUG_FINANCE) === "1" || String((req.query as any).debug) === "1";
  const log = (...args: any[]) => DEBUG && console.log(`[createSavingGoal:${RID}]`, ...args);

  try {
    const body = req.body as any;
    log("Body IN", body);

    const { userId, title, targetAmount, monthlyContribution, deadline, currentAmount = 0 } = body;
    if (!userId || !title || !(typeof targetAmount === "number" && targetAmount > 0)) {
      log("Validation fail", { userId: !!userId, title: !!title, targetAmount });
      return res.status(400).json({ message: "Missing userId/title/targetAmount" });
    }

    const doc = {
      kind: "saving_goal",
      userId,
      title: String(title).trim(),
      targetAmount: Number(targetAmount),
      monthlyContribution: typeof monthlyContribution === "number" ? monthlyContribution : 0,
      currentAmount: typeof currentAmount === "number" ? currentAmount : 0,
      deadline: typeof deadline === "string" ? deadline : null,
      createdAt: nowISO(),
      updatedAt: nowISO(),
    };

    const { db } = await connectToDatabase();
    const r = await insertFinance(db, doc as any);

    log("Created", { id: r.id, title: doc.title, targetAmount: doc.targetAmount });
    return res.status(201).json({ ok: true, id: r.id });
  } catch (e) {
    console.error(`[createSavingGoal:${RID}] ERROR`, e);
    return res.status(500).json({ message: "Internal server error" });
  }
}
