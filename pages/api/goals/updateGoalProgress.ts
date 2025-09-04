// /pages/api/goals/updateGoalProgress.ts
import { NextApiRequest, NextApiResponse } from "next";
import { connectToDatabase } from "../db/mongo";
import { ObjectId } from "mongodb";
// ⬇️ NEU: serverseitige Berechnung ermöglichen (ändert nichts an bestehendem Verhalten)
import { computeGoalProgress } from "@/utils/goals/progress";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "PATCH") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  // ⬇️ NEU: recalc optional zulassen
  const { goalId, progress, completedAt, recalc } = req.body || {};

  if (!goalId) {
    return res.status(400).json({ message: "goalId ist erforderlich" });
  }

  try {
    const { db } = await connectToDatabase();
    const appData = db.collection("appData");

    let nextProgress: number | undefined = typeof progress === "number" ? progress : undefined;
    let nextCompletedAt: string | null | undefined = typeof completedAt !== "undefined" ? completedAt : undefined;

    // ⬇️ NEU: Wenn recalc gewünscht ODER progress nicht mitgegeben, Fortschritt aus Tasks/Subgoals berechnen
    if (recalc || typeof nextProgress !== "number") {
      const goalDoc = await appData.findOne({ _id: new ObjectId(goalId), type: "goal" }) as any;
      if (!goalDoc) {
        return res.status(404).json({ message: "Ziel nicht gefunden" });
      }
      const computed = computeGoalProgress({
        tasks: goalDoc?.tasks ?? [],
        subGoals: goalDoc?.subGoals ?? [],
      } as any);
      nextProgress = computed;
      // completedAt-Regel: bei 100% setzen (wenn nicht vorhanden), sonst nullen
      nextCompletedAt = computed === 100 ? (goalDoc.completedAt ?? new Date().toISOString()) : null;
    }

    // Falls wir immer noch keinen numerischen Progress haben → Bad Request
    if (typeof nextProgress !== "number" || isNaN(nextProgress)) {
      return res.status(400).json({ message: "progress (0..100) fehlt oder ist ungültig. Oder 'recalc: true' verwenden." });
    }

    // clamp + round
    nextProgress = Math.max(0, Math.min(100, Math.round(nextProgress)));

    // ⬇️ Wenn completedAt nicht explizit gesetzt wurde, aus Progress ableiten
    if (typeof nextCompletedAt === "undefined") {
      nextCompletedAt = nextProgress === 100 ? new Date().toISOString() : null;
    }

    await appData.updateOne(
      { _id: new ObjectId(goalId), type: "goal" },
      {
        $set: {
          progress: nextProgress,
          // Wenn null: explizit null speichern; bei undefined: Feld unberührt lassen
          ...(nextCompletedAt === undefined ? {} : { completedAt: nextCompletedAt }),
          updatedAt: new Date().toISOString(),
        },
      }
    );

    return res.status(200).json({
      message: "Ziel aktualisiert",
      progress: nextProgress,
      completedAt: nextCompletedAt ?? undefined,
    });
  } catch (error) {
    console.error("Fehler beim Aktualisieren:", error);
    return res.status(500).json({ message: "Fehler beim Aktualisieren" });
  }
}
