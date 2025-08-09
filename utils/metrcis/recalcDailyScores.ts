import { connectToDatabase } from "@/pages/api/db/mongo";
import { ActionLog, DailyMindset, DailyScores } from "@/utils/interface";

function clamp(val: number, min: number, max: number) {
  return Math.max(min, Math.min(max, val));
}

function ema(current: number, previous: number | null, period: number) {
  if (previous == null) return current;
  const k = 2 / (period + 1);
  return previous + k * (current - previous);
}

export async function recalcDailyScores(userId: string, date: string) {
  const { db } = await connectToDatabase();

  const actions = await db
    .collection<ActionLog>("actionLogs")
    .find({ userId, date })
    .toArray();

  const mindset = await db
    .collection<DailyMindset>("mindsets")
    .findOne({ userId, date });

  const prevDay = new Date(date);
  prevDay.setDate(prevDay.getDate() - 1);
  const prevDate = prevDay.toISOString().slice(0, 10);
  const prevScores = await db
    .collection<DailyScores>("dailyScores")
    .findOne({ userId, date: prevDate });

  // Trust Tank
  let delta = 0;
  let unintendedCount = 0;
  actions.forEach((a) => {
    if (a.type === "commitment_done") delta += a.meta?.weight || 0;
    if (a.type === "commitment_broken") delta -= 2 * (a.meta?.weight || 0);
    if (a.type === "unintended_action") unintendedCount += 1;
  });
  const rawTrust = (prevScores?.trustTank ?? 50) + delta;
  const trustTank = clamp(ema(rawTrust, prevScores?.trustTank ?? null, 7), 0, 100);

  // Conviction
  const clarity10 = 0; // placeholder
  const followThrough7d = 0;
  const decisionConsistency = 0;
  const winRate14d = 0;
  const selfConfidence10 = (mindset?.convictionSelf ?? 5) * 10;
  const convRaw =
    (clarity10 + followThrough7d + decisionConsistency + winRate14d + selfConfidence10) /
    5;
  const conviction = clamp(
    ema(convRaw, prevScores?.conviction ?? null, 3),
    0,
    100
  );

  // Frequency
  const baseMindsetKeys = mindset
    ? ((
        mindset.beliefs +
        mindset.convictionSelf +
        mindset.perception +
        mindset.emotion +
        mindset.focus +
        mindset.reactions +
        mindset.expectations
      ) /
        7) * 10
    : 50;
  const frequencyRaw =
    baseMindsetKeys +
    (mindset ? mindset.heaven - 5 : 0) -
    (mindset ? mindset.neediness - 5 : 0) -
    unintendedCount * 2;
  const frequency = clamp(
    ema(frequencyRaw, prevScores?.frequency ?? null, 3),
    0,
    100
  );

  const doc: Omit<DailyScores, "_id"> = {
    userId,
    date,
    conviction,
    trustTank,
    frequency,
    details: {
      followThrough7d,
      decisionConsistency,
      winRate14d,
      clarity10,
      selfConfidence10,
      unintendedCount,
    },
    createdAt: new Date().toISOString(),
  };

  await db.collection<DailyScores>("dailyScores").updateOne(
    { userId, date },
    { $set: doc },
    { upsert: true }
  );

  return doc;
}