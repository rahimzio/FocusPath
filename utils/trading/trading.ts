import { connectToDatabase } from "../pages/api/db/mongo";

export default async function createIndexes() {
  const { db } = await connectToDatabase();
  await db.collection("user_accounts").createIndex({ userId: 1 });
  await db.collection("weekly_stats").createIndex({ userId: 1, week_start: 1 });
  await db.collection("trading").createIndex({ strategyId: 1 });
  await db.collection("trade_mistakes").createIndex({ userId: 1, mistake_type: 1 });
}