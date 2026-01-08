// pages/api/trading/weekly/review.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { connectToDatabase } from "@/pages/api/db/mongo";

type Grade = "A" | "B" | "C";

type WeeklyDoc = {
  _id?: any;
  type: "weekly_review";
  userId: string;

  label: string;        // "YYYY-MM Wn"
  month: string;        // "YYYY-MM"
  segment: "W1" | "W2" | "W3" | "W4";

  from: string;         // YYYY-MM-DD (local day key)
  to: string;           // YYYY-MM-DD (local day key)

  // Trades
  tradeCount: number;
  wins: number;
  losses: number;
  be: number;
  winRate: number;      // 0..100
  pnlSum: number;       // sum pnl
  maxDrawdown: number;  // simple equity DD based on pnl order

  // Day Reflections
  dayCount: number;
  avgDayScore: number;  // avg of dayAvgScore across days (0..3)
  dayGrades: { A: number; B: number; C: number };

  // ============================
  // ✅ NEW (Step 3): ICC Weekly
  // ============================
  iccTradeCount?: number;
  iccWins?: number;
  iccLosses?: number;
  iccBe?: number;
  iccWinRate?: number;
  iccViolations?: number;
  iccReviewOpen?: number;
  iccAvgChecklist?: number; // 0..1 (avg of checklist hit-rate)

  // =========================================
  // ✅ NEW (Step 3): Reflection/Setup summaries
  // =========================================
  avgReflectionScore?: number; // avg of reflectionAvgScore
  reflectionGrades?: { A: number; B: number; C: number };

  avgSetupScore?: number; // avg of setupAvgScore
  setupGrades?: { A: number; B: number; C: number };

  // Optional: meta
  computedAt: string;   // ISO
  createdAt?: string;
  updatedAt?: string;
  deleted?: boolean;
};

type TradeDoc = {
  _id?: any;
  type: "trading_trade_v1";
  userId: string;
  date?: string;        // YYYY-MM-DD (sometimes)
  createdAt?: string;   // ISO
  pnl?: number;
  result?: "win" | "loss" | "BE" | "ongoing";

  // ============================
  // ✅ NEW: ICC fields (optional)
  // ============================
  isICC?: boolean;
  violatedIccRules?: boolean;
  iccReviewNeeded?: boolean;

  iccChecklistPriceAt4h?: boolean;
  iccChecklist1HFollowsTrend?: boolean;
  iccChecklistBosSwing?: boolean;
  iccChecklistTfCorrelation?: boolean;
  iccChecklistEntryImpulseZone?: boolean;
  iccChecklistSessionTime?: boolean;
  iccChecklistTargetOppositeSide?: boolean;
};

// ✅ NEW: support v2 trade type as well (optional / future-proof)
type TradeDocV2 = TradeDoc & {
  type: "trading_trade_v2";
};

type DayReflectionDoc = {
  _id?: any;
  type: "day_reflection";
  userId: string;
  date: string;         // YYYY-MM-DD
  dayAvgScore?: number; // 0..3
  dayGrade?: Grade;
  deleted?: boolean;

  // ✅ NEW: Reflection Game aggregation fields
  reflectionAvgScore?: number; // 0..3
  reflectionGrade?: Grade;

  // ✅ NEW: Setup Game aggregation fields (future-proof)
  setupAvgScore?: number; // 0..3
  setupGrade?: Grade;
};

function toDateOnly(s?: string) {
  if (!s) return "";
  const str = String(s);
  return str.length >= 10 ? str.slice(0, 10) : str;
}

function isGrade(x: any): x is Grade {
  return x === "A" || x === "B" || x === "C";
}

function parseWeekLabel(label: string): { month: string; segment: "W1"|"W2"|"W3"|"W4" } | null {
  const m = String(label || "").trim().match(/^(\d{4}-\d{2})\s+(W[1-4])$/);
  if (!m) return null;
  const month = m[1];
  const segment = m[2] as "W1"|"W2"|"W3"|"W4";
  return { month, segment };
}

function lastDayOfMonth(year: number, monthIndex0: number) {
  // monthIndex0: 0..11
  return new Date(year, monthIndex0 + 1, 0).getDate();
}

function rangeFromLabel(label: string): { from: string; to: string; month: string; segment: "W1"|"W2"|"W3"|"W4" } | null {
  const parsed = parseWeekLabel(label);
  if (!parsed) return null;

  const [yStr, mStr] = parsed.month.split("-");
  const y = Number(yStr);
  const m = Number(mStr);
  if (!Number.isFinite(y) || !Number.isFinite(m) || m < 1 || m > 12) return null;

  const seg = parsed.segment;
  const startDay =
    seg === "W1" ? 1 :
    seg === "W2" ? 8 :
    seg === "W3" ? 15 : 22;

  const endDay =
    seg === "W1" ? 7 :
    seg === "W2" ? 14 :
    seg === "W3" ? 21 : lastDayOfMonth(y, m - 1);

  const z = (n: number) => String(n).padStart(2, "0");
  const from = `${y}-${z(m)}-${z(startDay)}`;
  const to = `${y}-${z(m)}-${z(endDay)}`;

  return { from, to, month: parsed.month, segment: seg };
}

function inRange(dateStr: string, from: string, to: string) {
  // lexicographic works for YYYY-MM-DD
  return dateStr >= from && dateStr <= to;
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const startedAt = Date.now();
  const { db } = await connectToDatabase();
  const col = db.collection("trading");

  // Indizes (idempotent)
  try {
    await Promise.all([
      col.createIndex({ type: 1, userId: 1, label: 1 }, { unique: true }),
      col.createIndex({ type: 1, userId: 1, deleted: 1 }),
      col.createIndex({ type: 1, userId: 1, computedAt: -1 }),
      col.createIndex({ type: 1, userId: 1, date: -1 }),
      // ✅ NEW: helps fetching trades by type quickly if needed later
      col.createIndex({ type: 1, userId: 1, createdAt: -1 }),
    ]);
  } catch (e: any) {
    console.warn("[API weekly/review] index warn:", e?.message);
  }

  if (req.method === "GET") {
    const userId = typeof req.query.userId === "string" ? req.query.userId : "";
    const label = typeof req.query.label === "string" ? req.query.label : "";

    if (!userId) return res.status(400).json({ error: "userId required" });
    if (!label) return res.status(400).json({ error: "label required (YYYY-MM Wn)" });

    try {
      const doc = await col.findOne({
        type: "weekly_review",
        userId,
        label,
        deleted: { $ne: true },
      });

      return res.status(200).json({ review: doc ?? null, durationMs: Date.now() - startedAt });
    } catch (e: any) {
      console.error("[API weekly/review][GET] ERROR:", e?.message, e);
      return res.status(500).json({ error: e?.message ?? "Server error" });
    }
  }

  if (req.method === "POST") {
    const body = req.body ?? {};
    const userId = String(body.userId || "").trim();
    const label = String(body.label || "").trim();

    if (!userId) return res.status(400).json({ error: "userId required" });
    if (!label) return res.status(400).json({ error: "label required (YYYY-MM Wn)" });

    const range = rangeFromLabel(label);
    if (!range) return res.status(400).json({ error: 'invalid label. expected "YYYY-MM W1..W4"' });

    const nowIso = new Date().toISOString();

    try {
      // 1) Trades holen (v1 + optional v2)
      const tradeDocs = (await col.find({
        type: { $in: ["trading_trade_v1", "trading_trade_v2"] },
        userId,
      }).toArray()) as (TradeDoc | TradeDocV2)[];

      // Tag-Keys für Trades bestimmen
      const tradesInRange = tradeDocs
        .map((t) => {
          const day = toDateOnly((t as any).date) || toDateOnly((t as any).createdAt);
          return { ...t, _day: day };
        })
        .filter((t: any) => t._day && inRange(t._day, range.from, range.to));

      // Sortierung für DD: nach day + createdAt
      tradesInRange.sort((a: any, b: any) => {
        const da = a._day.localeCompare(b._day);
        if (da !== 0) return da;
        const ta = new Date(a.createdAt || a.date || 0).getTime();
        const tb = new Date(b.createdAt || b.date || 0).getTime();
        return ta - tb;
      });

      const tradeCount = tradesInRange.length;
      const wins = tradesInRange.filter((t: any) => t.result === "win").length;
      const losses = tradesInRange.filter((t: any) => t.result === "loss").length;
      const be = tradesInRange.filter((t: any) => t.result === "BE").length;
      const winRate = tradeCount ? Math.round((wins / tradeCount) * 100) : 0;

      const pnlSum = round2(
        tradesInRange.reduce((acc: number, t: any) => acc + (Number.isFinite(Number(t.pnl)) ? Number(t.pnl) : 0), 0)
      );

      // Max Drawdown (simple equity curve on pnl)
      let equity = 0;
      let peak = 0;
      let maxDD = 0;
      for (const t of tradesInRange as any[]) {
        const p = Number.isFinite(Number(t.pnl)) ? Number(t.pnl) : 0;
        equity += p;
        if (equity > peak) peak = equity;
        const dd = peak - equity;
        if (dd > maxDD) maxDD = dd;
      }
      const maxDrawdown = round2(maxDD);

      // ============================
      // ✅ NEW: ICC Weekly stats
      // ============================
      const iccTradesInRange = (tradesInRange as any[]).filter((t) => t.isICC === true);
      const iccTradeCount = iccTradesInRange.length;
      const iccWins = iccTradesInRange.filter((t) => t.result === "win").length;
      const iccLosses = iccTradesInRange.filter((t) => t.result === "loss").length;
      const iccBe = iccTradesInRange.filter((t) => t.result === "BE").length;
      const iccWinRate = iccTradeCount ? Math.round((iccWins / iccTradeCount) * 100) : 0;

      const iccViolations = iccTradesInRange.filter((t) => t.violatedIccRules === true).length;
      const iccReviewOpen = iccTradesInRange.filter((t) => t.iccReviewNeeded === true).length;

      // avg checklist hit-rate (0..1)
      const checklistFields = [
        "iccChecklistPriceAt4h",
        "iccChecklist1HFollowsTrend",
        "iccChecklistBosSwing",
        "iccChecklistTfCorrelation",
        "iccChecklistEntryImpulseZone",
        "iccChecklistSessionTime",
        "iccChecklistTargetOppositeSide",
      ] as const;

      let iccChecklistSum = 0;
      let iccChecklistN = 0;

      for (const t of iccTradesInRange) {
        let hits = 0;
        for (const f of checklistFields) if (t?.[f] === true) hits += 1;
        iccChecklistSum += hits / checklistFields.length;
        iccChecklistN += 1;
      }

      const iccAvgChecklist = iccChecklistN ? round2(iccChecklistSum / iccChecklistN) : 0;

      // 2) Day Reflections holen
      const dayDocs = (await col.find({
        type: "day_reflection",
        userId,
        deleted: { $ne: true },
      }).toArray()) as DayReflectionDoc[];

      const daysInRange = dayDocs.filter((d) => d.date && inRange(d.date, range.from, range.to));
      const dayCount = daysInRange.length;

      const dayGrades = { A: 0, B: 0, C: 0 };
      let dayScoreSum = 0;
      let dayScoreN = 0;

      // ✅ NEW: reflection/setup aggregation
      const reflectionGrades = { A: 0, B: 0, C: 0 };
      let reflectionScoreSum = 0;
      let reflectionScoreN = 0;

      const setupGrades = { A: 0, B: 0, C: 0 };
      let setupScoreSum = 0;
      let setupScoreN = 0;

      for (const d of daysInRange) {
        if (isGrade(d.dayGrade)) dayGrades[d.dayGrade] += 1;
        const s = Number(d.dayAvgScore);
        if (Number.isFinite(s)) {
          dayScoreSum += s;
          dayScoreN += 1;
        }

        // ✅ NEW: reflection avg/grade
        if (isGrade(d.reflectionGrade)) reflectionGrades[d.reflectionGrade] += 1;
        const rs = Number((d as any).reflectionAvgScore);
        if (Number.isFinite(rs)) {
          reflectionScoreSum += rs;
          reflectionScoreN += 1;
        }

        // ✅ NEW: setup avg/grade (future-proof)
        if (isGrade((d as any).setupGrade)) setupGrades[(d as any).setupGrade] += 1;
        const ss = Number((d as any).setupAvgScore);
        if (Number.isFinite(ss)) {
          setupScoreSum += ss;
          setupScoreN += 1;
        }
      }

      const avgDayScore = dayScoreN ? round2(dayScoreSum / dayScoreN) : 0;

      const avgReflectionScore = reflectionScoreN ? round2(reflectionScoreSum / reflectionScoreN) : 0;
      const avgSetupScore = setupScoreN ? round2(setupScoreSum / setupScoreN) : 0;

      const weeklyDoc: WeeklyDoc = {
        type: "weekly_review",
        userId,
        label,
        month: range.month,
        segment: range.segment,
        from: range.from,
        to: range.to,

        tradeCount,
        wins,
        losses,
        be,
        winRate,
        pnlSum,
        maxDrawdown,

        dayCount,
        avgDayScore,
        dayGrades,

        // ✅ NEW: ICC weekly
        iccTradeCount,
        iccWins,
        iccLosses,
        iccBe,
        iccWinRate,
        iccViolations,
        iccReviewOpen,
        iccAvgChecklist,

        // ✅ NEW: reflection/setup summaries
        avgReflectionScore,
        reflectionGrades,

        avgSetupScore,
        setupGrades,

        computedAt: nowIso,
        updatedAt: nowIso,
        deleted: false,
      };

      // Upsert
      await col.updateOne(
        { type: "weekly_review", userId, label },
        { $set: weeklyDoc, $setOnInsert: { createdAt: nowIso } },
        { upsert: true }
      );

      const saved = await col.findOne({ type: "weekly_review", userId, label });

      return res.status(200).json({
        ok: true,
        review: saved ?? null,
        meta: { durationMs: Date.now() - startedAt },
      });
    } catch (e: any) {
      console.error("[API weekly/review][POST] ERROR:", e?.message, e);
      return res.status(500).json({ error: e?.message ?? "Server error" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
