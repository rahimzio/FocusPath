import { connectToDatabase } from "../pages/api/db/mongo";
import { ActionLog, DailyMindset, DailyScores } from "../utils/interface";

/**
 * Recalculate daily scores for a user on a specific date.
 * This is a simplified placeholder that currently sums commitment outcomes
 * and unintended actions. The detailed scoring logic can be implemented later.
 */
export async function recalcDailyScores(userId: string, date: string) {
  const { db } = await connectToDatabase();
  const appData = db.collection("appData");

  // Fetch relevant data for the day
  const logs = await appData
    .find<ActionLog>({ type: "action_log", userId, date })
    .toArray();

  const mindset = await appData.findOne<DailyMindset>({ type: "mindset", userId, date });

  // Very naive calculations – to be replaced with full formulas
  let trustTank = 50;
  let conviction = 50;
  let frequency = 50;

  const unintended = logs.filter((l) => l.logType === "unintended_action").length;
  frequency -= unintended * 2;

  const done = logs.filter((l) => l.logType === "commitment_done").length;
  const broken = logs.filter((l) => l.logType === "commitment_broken").length;
  trustTank += done * 2 - broken * 4;

  if (mindset) {
    const base =
      (mindset.beliefs +
        mindset.convictionSelf +
        mindset.perception +
        mindset.emotion +
        mindset.focus +
        mindset.reactions +
        mindset.expectations) /
        7;
    frequency += base * 10;
  }

  // Clamp values
  trustTank = Math.max(0, Math.min(100, trustTank));
  conviction = Math.max(0, Math.min(100, conviction));
  frequency = Math.max(0, Math.min(100, frequency));

  const existing = await appData.findOne<DailyScores>({
    type: "daily_scores",
    userId,
    date,
  });

  const payload: Omit<DailyScores, "_id"> & { type: string } = {
    type: "daily_scores",
    userId,
    date,
    conviction,
    trustTank,
    frequency,
    createdAt: new Date().toISOString(),
  };

  if (existing) {
    await appData.updateOne({ _id: existing._id as any }, { $set: payload });
  } else {
    await appData.insertOne(payload);
  }
}