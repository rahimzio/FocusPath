// pages/api/trading/improve/progress.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { connectToDatabase } from "@/pages/api/db/mongo";

type Scope = "trade" | "setup" | "reflection" | "all";
type Metric = "count" | "rate";
type Grade = "A" | "B" | "C";

type GameLibraryItem = {
  _id?: any;
  type: "gameLibrary";
  userId: string;
  label: string;
  game: string; // A/B/C (legacy-safe)
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

type FactorRow = {
  id: string;
  label: string;
  scope: Exclude<Scope, "all">;
  grade: Grade;
  count: number;
  rate: number; // count / total events in scope
};

type SummaryByScope = {
  totalEvents: number; // trades OR executed setups OR day reflections
  picks: { A: number; B: number; C: number }; // total clicks
  rates: { A: number; B: number; C: number }; // picks / totalEvents
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const startedAt = Date.now();

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const userId = typeof req.query.userId === "string" ? req.query.userId.trim() : "";
  if (!userId) return res.status(400).json({ error: "userId required" });

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

  try {
    const { db } = await connectToDatabase();
    const col = db.collection("trading");

    // Load Game Library (active, not archived)
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

    // Pull sources
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

    // counts by item id within scope
    const countsByScope: Record<Exclude<Scope, "all">, Map<string, number>> = {
      trade: new Map(),
      setup: new Map(),
      reflection: new Map(),
    };

    // grade pick totals per scope
    const gradePicksByScope: Record<Exclude<Scope, "all">, { A: number; B: number; C: number }> = {
      trade: { A: 0, B: 0, C: 0 },
      setup: { A: 0, B: 0, C: 0 },
      reflection: { A: 0, B: 0, C: 0 },
    };

    // daily series buckets
    const daily: Record<
      string,
      {
        day: string;
        tradeEvents: number;
        setupEvents: number;
        reflectionEvents: number;
        picks: {
          trade: { A: number; B: number; C: number };
          setup: { A: number; B: number; C: number };
          reflection: { A: number; B: number; C: number };
        };
      }
    > = {};

    function ensureDay(day: string) {
      if (!daily[day]) {
        daily[day] = {
          day,
          tradeEvents: 0,
          setupEvents: 0,
          reflectionEvents: 0,
          picks: {
            trade: { A: 0, B: 0, C: 0 },
            setup: { A: 0, B: 0, C: 0 },
            reflection: { A: 0, B: 0, C: 0 },
          },
        };
      }
      return daily[day];
    }

    for (const t of trades as any[]) {
      const day = t._day as string;
      ensureDay(day).tradeEvents += 1;

      const ids = uniqStrings(t.tradeSelectedIds) ?? [];
      for (const id of ids) {
        const meta = libMap.get(id);
        if (!meta || meta.scope !== "trade") continue;

        countsByScope.trade.set(id, (countsByScope.trade.get(id) ?? 0) + 1);
        gradePicksByScope.trade[meta.grade] += 1;
        ensureDay(day).picks.trade[meta.grade] += 1;
      }
    }

    for (const s of executedSetups as any[]) {
      const day = s._day as string;
      ensureDay(day).setupEvents += 1;

      const ids = uniqStrings(s.setupSelectedIds) ?? [];
      for (const id of ids) {
        const meta = libMap.get(id);
        if (!meta || meta.scope !== "setup") continue;

        countsByScope.setup.set(id, (countsByScope.setup.get(id) ?? 0) + 1);
        gradePicksByScope.setup[meta.grade] += 1;
        ensureDay(day).picks.setup[meta.grade] += 1;
      }
    }

    for (const d of dayReflections as any[]) {
      const day = d.date as string;
      ensureDay(day).reflectionEvents += 1;

      const ids =
        uniqStrings(d.reflectionSelectedIds) ??
        uniqStrings(d.reflectionGame?.selectedIds) ??
        [];
      for (const id of ids) {
        const meta = libMap.get(id);
        if (!meta || meta.scope !== "reflection") continue;

        countsByScope.reflection.set(id, (countsByScope.reflection.get(id) ?? 0) + 1);
        gradePicksByScope.reflection[meta.grade] += 1;
        ensureDay(day).picks.reflection[meta.grade] += 1;
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

    const topC = rows
      .filter((r) => r.grade === "C")
      .sort((a, b) => (b[metric] as number) - (a[metric] as number))
      .slice(0, topN);

    const lowA = rows
      .filter((r) => r.grade === "A")
      .sort((a, b) => (a[metric] as number) - (b[metric] as number))
      .slice(0, topN);

    function summaryFor(s: Exclude<Scope, "all">): SummaryByScope {
      const totalEvents = totals[s] || 0;
      const picks = gradePicksByScope[s];
      return {
        totalEvents,
        picks,
        rates: {
          A: totalEvents ? +(picks.A / totalEvents).toFixed(4) : 0,
          B: totalEvents ? +(picks.B / totalEvents).toFixed(4) : 0,
          C: totalEvents ? +(picks.C / totalEvents).toFixed(4) : 0,
        },
      };
    }

    // combined summary (weighted by events)
    const combinedTotal =
      totals.trade + totals.setup + totals.reflection;

    const combinedPicks = {
      A: gradePicksByScope.trade.A + gradePicksByScope.setup.A + gradePicksByScope.reflection.A,
      B: gradePicksByScope.trade.B + gradePicksByScope.setup.B + gradePicksByScope.reflection.B,
      C: gradePicksByScope.trade.C + gradePicksByScope.setup.C + gradePicksByScope.reflection.C,
    };

    const combined = {
      totalEvents: combinedTotal,
      picks: combinedPicks,
      rates: {
        A: combinedTotal ? +(combinedPicks.A / combinedTotal).toFixed(4) : 0,
        B: combinedTotal ? +(combinedPicks.B / combinedTotal).toFixed(4) : 0,
        C: combinedTotal ? +(combinedPicks.C / combinedTotal).toFixed(4) : 0,
      },
    };

    const dailySeries = Object.values(daily).sort((a, b) => a.day.localeCompare(b.day));

    return res.status(200).json({
      ok: true,
      userId,

      range: { period, from, to },
      scope,
      metric,
      top: topN,
      minCount,

      totals: {
        trades: totals.trade,
        executedSetups: totals.setup,
        dayReflections: totals.reflection,
      },

      summary: {
        trade: summaryFor("trade"),
        setup: summaryFor("setup"),
        reflection: summaryFor("reflection"),
        combined,
      },

      factors: {
        topC,
        lowA,
      },

      daily: dailySeries,

      meta: { durationMs: Date.now() - startedAt },
    });
  } catch (e: any) {
    console.error("[API improve/progress] ERROR:", e?.message, e);
    return res.status(500).json({ error: e?.message ?? "Server error" });
  }
}
