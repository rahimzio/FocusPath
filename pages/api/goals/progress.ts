// pages/api/goals/progress.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { ObjectId } from "mongodb";
import { connectToDatabase } from "../db/mongo"; // <- gleich wie in deinen anderen Routen
import { computeGoalProgress } from "@/utils/goals/progress";

type Body = {
  goalId?: string;
  progress?: number;           // 0..100 (optional, wenn recalc true ist)
  completedAt?: string | null; // optional
  recalc?: boolean;            // wenn true, progress aus Tasks/Subgoals berechnen
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "PATCH") {
    res.setHeader("Allow", ["PATCH"]);
    return res.status(405).end("Method Not Allowed");
  }

  try {
    const { goalId, progress, completedAt, recalc } = (req.body || {}) as Body;
    if (!goalId || !ObjectId.isValid(goalId)) {
      return res.status(400).json({ ok: false, error: "goalId missing/invalid" });
    }

    const { db } = await connectToDatabase();
    const appData = db.collection("appData");

    // bestehendes Datenmodell: in appData mit type:"goal"
    const _id = new ObjectId(goalId);
    const goal = await appData.findOne({ _id, type: "goal" });
    if (!goal) return res.status(404).json({ ok: false, error: "goal not found" });

    let nextProgress: number | undefined = progress;
    let nextCompletedAt: string | null | undefined = completedAt;

    if (recalc || typeof nextProgress !== "number") {
      const computed = computeGoalProgress({
        tasks: goal?.tasks ?? [],
        subGoals: goal?.subGoals ?? [],
      } as any);
      nextProgress = computed;
      nextCompletedAt = computed === 100 ? (goal.completedAt ?? new Date().toISOString()) : null;
    }

    if (typeof nextProgress !== "number" || isNaN(nextProgress)) {
      return res.status(400).json({ ok: false, error: "progress must be a number (0..100) or use recalc:true" });
    }

    nextProgress = Math.max(0, Math.min(100, Math.round(nextProgress)));

    // Wenn completedAt nicht explizit gesetzt wurde → aus progress ableiten
    if (typeof nextCompletedAt === "undefined") {
      nextCompletedAt = nextProgress === 100 ? new Date().toISOString() : null;
    }

    await appData.updateOne(
      { _id, type: "goal" },
      {
        $set: {
          progress: nextProgress,
          completedAt: nextCompletedAt ?? undefined,
          updatedAt: new Date().toISOString(),
        },
      }
    );

    return res.status(200).json({ ok: true, goalId, progress: nextProgress, completedAt: nextCompletedAt });
  } catch (e: any) {
    console.error(e);
    return res.status(500).json({ ok: false, error: e?.message || "internal error" });
  }
}
