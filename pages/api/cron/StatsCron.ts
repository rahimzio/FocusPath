import cron from "node-cron";
import { TradeEntry, WeeklyStat } from "@/utils/interface";
import { connectToDatabase } from "../db/connectToDatabase";

async function computeStats() {
  const { db } = await connectToDatabase();
  const trades = db.collection<TradeEntry>("trading");
  const weekly = db.collection<WeeklyStat>("weekly_stats");

  // last week Monday
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1); // last Monday
  const monday = new Date(now.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  const nextMonday = new Date(monday);
  nextMonday.setDate(monday.getDate() + 7);

  const agg = await trades.aggregate([
    {
      $match: {
        type: "tradeEntry",
        date: { $gte: monday.toISOString().slice(0, 10), $lt: nextMonday.toISOString().slice(0, 10) },
      },
    },
    {
      $group: {
        _id: { userId: "$userId", symbol: "$symbol" },
        win: { $sum: { $cond: [{ $eq: ["$result", "win"] }, 1, 0] } },
        count: { $sum: 1 },
        pnl: { $sum: "$pnl" },
      },
    },
  ]).toArray();

  const byUser: Record<string, any[]> = {};
  agg.forEach((a) => {
    if (!byUser[a._id.userId]) byUser[a._id.userId] = [];
    byUser[a._id.userId].push(a);
  });

  for (const userId of Object.keys(byUser)) {
    const data = byUser[userId];
    const best = data.reduce((p, c) => (c.pnl > p.pnl ? c : p));
    const winRate = data.reduce((s, x) => s + x.win, 0) / data.reduce((s, x) => s + x.count, 0);
    const pctChange = data.reduce((s, x) => s + x.pnl, 0);
    const topPairs = data.map((x) => ({ pair: x._id.symbol, win_rate: x.win / x.count }));
    await weekly.updateOne(
      { userId, week_start: monday.toISOString().slice(0, 10) },
      {
        $set: {
          best_pair: best._id.symbol,
          win_rate: winRate,
          pct_change: pctChange,
          top_pairs: topPairs,
          createdAt: new Date().toISOString(),
        },
      },
      { upsert: true }
    );
  }
}

cron.schedule("0 0 * * 1", () => {
  console.log("Running weekly stats cron...");
  computeStats();
});

export default computeStats;