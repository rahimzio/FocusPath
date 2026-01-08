// pages/api/trading/improve/overview.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { connectToDatabase } from "@/pages/api/db/mongo";

type Scope = "trade" | "setup" | "reflection" | "all";
type Metric = "count" | "rate";
type Grade = "A" | "B" | "C";

type InchwormPlanDoc = {
  _id?: any;
  type: "inchworm_plan";
  userId: string;
  status?: "active" | "archived";
  deleted?: boolean;

  period: string;
  focus?: string;

  from?: string; // YYYY-MM-DD
  to?: string;   // YYYY-MM-DD

  todayDrillId?: string;

  selected?: any;
  targets?: any;

  createdAt?: string;
  updatedAt?: string;
};

type DrillDoc = {
  _id?: any;
  type: "improve_drill_v1";
  userId: string;

  title: string;
  description?: string;
  active?: boolean;
  archived?: boolean;
  tags?: string[];

  factorIds?: string[];
  scope?: Scope;
  targetGame?: "A" | "B" | "C";
  minCount?: number;
  maxCount?: number;

  createdAt?: string;
  updatedAt?: string;
  deleted?: boolean;
};

type DrillDoneDoc = {
  _id?: any;
  type: "improve_drill_done_v1";
  userId: string;
  drillId: string;
  date: string; // YYYY-MM-DD
  deleted?: boolean;
};

type GameLibraryItem = {
  _id?: any;
  type: "gameLibrary";
  userId: string;
  label: string;
  game: string; // A/B/C
  scope?: "trade" | "setup" | "reflection";
  active?: boolean;
  archived?: boolean;
};

type TradeDoc = {
  _id?: any;
  type: "trading_trade_v1";
  userId: string;
  date?: string; // YYYY-MM-DD
  createdAt?: string; // ISO
  deleted?: boolean;
  tradeSelectedIds?: string[];
};

type SetupDoc = {
  _id?: any;
  type: "trading_setup_v2";
  userId: string;
  createdAt?: string; // ISO
  updatedAt?: string; // ISO
  deleted?: boolean;
  status?: string; // executed if "active"
  setupSelectedIds?: string[];
};

type DayReflectionDoc = {
  _id?: any;
  type: "day_reflection";
  userId: string;
  date: string; // YYYY-MM-DD
  deleted?: boolean;
  reflectionSelectedIds?: string[];
  reflectionGame?: { selectedIds?: string[] }; // legacy
};

type FactorRow = {
  id: string;
  label: string;
  scope: Exclude<Scope, "all">;
  grade: Grade;
  count: number;
  rate: number;
};

function toDateOnly(s?: string) {
  if (!s) return "";
  const str = String(s);
  return str.length >= 10 ? str.slice(0, 10) : str;
}

function uniqStrings(input: any): string[] | undefined {
  if (!Array.isArray(input)) return undefined;
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of input) {
    const s = String(raw ?? "").trim();
    if (!s) continue;
    if (seen.has(s)) continue;
    seen.add(s);
    out.push(s);
  }
  return out.length ? out : undefined;
}

function startOfPrevMonthUTC(now = new Date()) {
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  const start = new Date(Date.UTC(y, m - 1, 1));
  const end = new Date(Date.UTC(y, m, 0));
  return { start, end };
}

function dayKeyFromUTCDate(d: Date) {
  const z = (n: number) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}-${z(d.getUTCMonth() + 1)}-${z(d.getUTCDate())}`;
}

function inRange(day: string, from: string, to: string) {
  return day >= from && day <= to;
}

function safeScope(x: any): Scope {
  const s = String(x || "").trim().toLowerCase();
  if (s === "trade" || s === "setup" || s === "reflection" || s === "all") return s;
  return "all";
}

function safeMetric(x: any): Metric {
  const s = String(x || "").trim().toLowerCase();
  return s === "rate" ? "rate" : "count";
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const startedAt = Date.now();

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const userId = typeof req.query.userId === "string" ? req.query.userId.trim() : "";
  if (!userId) return res.status(400).json({ error: "userId required" });

  // Factors/Progress options (same semantics as progress.ts/factors.ts)
  const scope = safeScope(req.query.scope);
  const metric = safeMetric(req.query.metric);
  const topN = Math.max(1, Math.min(50, Number(req.query.top ?? 3) || 3));
  const minCount = Math.max(1, Math.min(9999, Number(req.query.minCount ?? 1) || 1));

  // Range:
  // default: prev_month (as requested)
  // overrides: from/to
  const period = typeof req.query.period === "string" ? req.query.period : "prev_month";
  const fromQ = typeof req.query.from === "string" ? toDateOnly(req.query.from) : "";
  const toQ = typeof req.query.to === "string" ? toDateOnly(req.query.to) : "";

  let from = "";
  let to = "";

  if (fromQ && toQ) {
    from = fromQ;
    to = toQ;
  } else if (period === "rolling_30d") {
    const now = new Date();
    const toD = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const fromD = new Date(toD);
    fromD.setUTCDate(fromD.getUTCDate() - 29);
    from = dayKeyFromUTCDate(fromD);
    to = dayKeyFromUTCDate(toD);
  } else {
    const { start, end } = startOfPrevMonthUTC(new Date());
    from = dayKeyFromUTCDate(start);
    to = dayKeyFromUTCDate(end);
  }

  const nowDay = toDateOnly(new Date().toISOString());

  try {
    const { db } = await connectToDatabase();
    const col = db.collection("trading");

    // 1) Active plan (overview always wants this)
    const plan = (await col.findOne({
      type: "inchworm_plan",
      userId,
      deleted: { $ne: true },
      status: { $ne: "archived" },
    })) as InchwormPlanDoc | null;

    // 2) Resolve today drill
    let todayDrill: DrillDoc | null = null;
    if (plan?.todayDrillId) {
      const d = await col.findOne({
        type: "improve_drill_v1",
        userId,
        deleted: { $ne: true },
        archived: { $ne: true },
        _id: (() => {
          try {
            // try ObjectId in mongo, but allow string fallback
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const { ObjectId } = require("mongodb");
            return new ObjectId(String(plan.todayDrillId));
          } catch {
            return plan.todayDrillId;
          }
        })(),
      });
      if (d) todayDrill = d as DrillDoc;
    }

    // 3) Drill done today?
    let drillDoneToday = false;
    if (plan?.todayDrillId) {
      const done = (await col.findOne({
        type: "improve_drill_done_v1",
        userId,
        drillId: String(plan.todayDrillId),
        date: nowDay,
        deleted: { $ne: true },
      })) as DrillDoneDoc | null;
      drillDoneToday = !!done;
    }

    // 4) Build factors snapshot (Top-C + Low-A) in one query batch
    const libItems = (await col
      .find({
        type: "gameLibrary",
        userId,
        archived: { $ne: true },
        active: { $ne: false },
      })
      .project({ _id: 1, label: 1, game: 1, scope: 1 })
      .toArray()) as GameLibraryItem[];

    const libMap = new Map<string, { label: string; grade: Grade; scope: Exclude<Scope, "all"> }>();
    for (const it of libItems) {
      const id = String((it as any)._id ?? "");
      const g = String(it.game ?? "").toUpperCase();
      const sc = (it.scope ?? "trade") as Exclude<Scope, "all">;
      if (!id) continue;
      if (g !== "A" && g !== "B" && g !== "C") continue;
      if (sc !== "trade" && sc !== "setup" && sc !== "reflection") continue;
      libMap.set(id, { label: it.label, grade: g as Grade, scope: sc });
    }

    const [tradesAll, setupsAll, daysAll] = await Promise.all([
      col
        .find({ type: "trading_trade_v1", userId, deleted: { $ne: true } })
        .project({ _id: 1, date: 1, createdAt: 1, tradeSelectedIds: 1 })
        .toArray() as Promise<TradeDoc[]>,
      col
        .find({ type: "trading_setup_v2", userId, deleted: { $ne: true } })
        .project({ _id: 1, createdAt: 1, updatedAt: 1, status: 1, setupSelectedIds: 1 })
        .toArray() as Promise<SetupDoc[]>,
      col
        .find({ type: "day_reflection", userId, deleted: { $ne: true } })
        .project({ _id: 1, date: 1, reflectionSelectedIds: 1, reflectionGame: 1 })
        .toArray() as Promise<DayReflectionDoc[]>,
    ]);

    const trades = tradesAll
      .map((t) => ({ ...t, _day: toDateOnly(t.date) || toDateOnly(t.createdAt) }))
      .filter((t) => t._day && inRange(t._day, from, to));

    const executedSetups = setupsAll
      .map((s) => ({ ...s, _day: toDateOnly(s.createdAt) || toDateOnly(s.updatedAt) }))
      .filter((s) => s._day && inRange(s._day, from, to))
      .filter((s) => String(s.status ?? "").toLowerCase() === "active");

    const dayReflections = daysAll.filter((d) => d.date && inRange(d.date, from, to));

    const totals = {
      trade: trades.length,
      setup: executedSetups.length,
      reflection: dayReflections.length,
    };

    const countsByScope: Record<Exclude<Scope, "all">, Map<string, number>> = {
      trade: new Map(),
      setup: new Map(),
      reflection: new Map(),
    };

    for (const t of trades) {
      const ids = uniqStrings((t as any).tradeSelectedIds) ?? [];
      for (const id of ids) {
        const meta = libMap.get(id);
        if (!meta || meta.scope !== "trade") continue;
        countsByScope.trade.set(id, (countsByScope.trade.get(id) ?? 0) + 1);
      }
    }

    for (const s of executedSetups) {
      const ids = uniqStrings((s as any).setupSelectedIds) ?? [];
      for (const id of ids) {
        const meta = libMap.get(id);
        if (!meta || meta.scope !== "setup") continue;
        countsByScope.setup.set(id, (countsByScope.setup.get(id) ?? 0) + 1);
      }
    }

    for (const d of dayReflections) {
      const ids =
        uniqStrings((d as any).reflectionSelectedIds) ??
        uniqStrings((d as any).reflectionGame?.selectedIds) ??
        [];
      for (const id of ids) {
        const meta = libMap.get(id);
        if (!meta || meta.scope !== "reflection") continue;
        countsByScope.reflection.set(id, (countsByScope.reflection.get(id) ?? 0) + 1);
      }
    }

    function buildRows(forScope: Exclude<Scope, "all">): FactorRow[] {
      const total = totals[forScope] || 0;
      const out: FactorRow[] = [];

      for (const [id, count] of countsByScope[forScope].entries()) {
        const meta = libMap.get(id);
        if (!meta) continue;

        if (count < minCount) continue;

        const rate = total > 0 ? count / total : 0;

        out.push({
          id,
          label: meta.label,
          scope: forScope,
          grade: meta.grade,
          count,
          rate: +rate.toFixed(4),
        });
      }

      return out;
    }

    const rows: FactorRow[] = [];
    if (scope === "all" || scope === "trade") rows.push(...buildRows("trade"));
    if (scope === "all" || scope === "setup") rows.push(...buildRows("setup"));
    if (scope === "all" || scope === "reflection") rows.push(...buildRows("reflection"));

    const sortMetric: Metric = metric;

    const topC = rows
      .filter((r) => r.grade === "C")
      .sort((a, b) => (b[sortMetric] as number) - (a[sortMetric] as number))
      .slice(0, topN);

    const lowA = rows
      .filter((r) => r.grade === "A")
      .sort((a, b) => (a[sortMetric] as number) - (b[sortMetric] as number))
      .slice(0, topN);

    return res.status(200).json({
      ok: true,
      userId,

      // ✅ what ImproveAtAGlance needs
      plan: plan ?? null,
      todayDrill: todayDrill ?? null,
      drillDoneToday,

      // ✅ what the “C hot / A weak” cards need
      range: { period, from, to },
      scope,
      metric: sortMetric,
      top: topN,
      minCount,
      totals: {
        trades: totals.trade,
        executedSetups: totals.setup,
        dayReflections: totals.reflection,
      },
      factors: {
        topC,
        lowA,
      },

      meta: { durationMs: Date.now() - startedAt },
    });
  } catch (e: any) {
    console.error("[API improve/overview] ERROR:", e?.message, e);
    return res.status(500).json({ error: e?.message ?? "Server error" });
  }
}
