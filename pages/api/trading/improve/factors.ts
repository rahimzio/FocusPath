// pages/api/trading/improve/factors.ts
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
  game: string; // A/B/C (kann legacy auch anderes enthalten)
  points?: number;
  active?: boolean;
  archived?: boolean;
  scope?: "trade" | "setup" | "reflection";
};

type TradeDoc = {
  _id?: any;
  type: "trading_trade_v1";
  userId: string;
  date?: string; // YYYY-MM-DD
  createdAt?: string; // ISO
  deleted?: boolean;

  // Improve-Faktoren (Trade Game / GamePicker)
  tradeSelectedIds?: string[];
};

type SetupDoc = {
  _id?: any;
  type: "trading_setup_v2";
  userId: string;
  createdAt?: string; // ISO
  updatedAt?: string; // ISO
  deleted?: boolean;

  status?: string; // "active" => executed
  setupSelectedIds?: string[];
};

type DayReflectionDoc = {
  _id?: any;
  type: "day_reflection";
  userId: string;
  date: string; // YYYY-MM-DD
  deleted?: boolean;

  reflectionSelectedIds?: string[];
  // legacy support:
  reflectionGame?: { selectedIds?: string[] };
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

// previous calendar month (UTC)
function startOfPrevMonthUTC(now = new Date()) {
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth(); // current month (0..11)
  const start = new Date(Date.UTC(y, m - 1, 1));
  const end = new Date(Date.UTC(y, m, 0)); // last day of prev month
  return { start, end };
}

function dayKeyFromUTCDate(d: Date) {
  const z = (n: number) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}-${z(d.getUTCMonth() + 1)}-${z(d.getUTCDate())}`;
}

function inRange(day: string, from: string, to: string) {
  // YYYY-MM-DD lexicographic
  return day >= from && day <= to;
}

type FactorRow = {
  id: string;
  label: string;
  scope: Exclude<Scope, "all">;
  grade: Grade;
  count: number;
  rate: number; // count / total in that scope

  // ✅ ADD: useful for UI/targets without refetch
  targetMin?: number; // for A
  targetMax?: number; // for C
  outOfTarget?: boolean;
  deltaToTarget?: number; // A: (minA - count) if below, C: (count - maxC) if above
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const startedAt = Date.now();

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const userId = typeof req.query.userId === "string" ? req.query.userId.trim() : "";
  if (!userId) return res.status(400).json({ error: "userId required" });

  // scope: trade/setup/reflection/all
  const scope = (typeof req.query.scope === "string" ? req.query.scope : "all") as Scope;

  // mode: c_hot | a_weak | both
  const modeRaw = typeof req.query.mode === "string" ? req.query.mode : "both";
  const mode = modeRaw === "c_hot" || modeRaw === "a_weak" ? modeRaw : "both";

  // metric: count | rate (sorting)
  const metric = (typeof req.query.metric === "string" ? req.query.metric : "count") as Metric;
  const sortMetric: Metric = metric === "rate" ? "rate" : "count";

  // top N (default 3)
  const topN = Math.max(1, Math.min(50, Number(req.query.top ?? 3) || 3));

  // minCount (default 1) => Faktoren müssen mind. 1x vorkommen
  const minCount = Math.max(1, Math.min(9999, Number(req.query.minCount ?? 1) || 1));

  // thresholds (optional)
  // A: minimum occurrences in period (want MORE)
  // C: maximum occurrences in period (want LESS)
  const minAValRaw = req.query.minA;
  const maxCValRaw = req.query.maxC;
  const minAVal = Number.isFinite(Number(minAValRaw)) ? Number(minAValRaw) : undefined;
  const maxCVal = Number.isFinite(Number(maxCValRaw)) ? Number(maxCValRaw) : undefined;

  // ✅ Range default: prev_month (as agreed)
  const period = typeof req.query.period === "string" ? req.query.period : "prev_month";

  let from = "";
  let to = "";

  const fromQ = typeof req.query.from === "string" ? toDateOnly(req.query.from) : "";
  const toQ = typeof req.query.to === "string" ? toDateOnly(req.query.to) : "";

  if (fromQ && toQ) {
    from = fromQ;
    to = toQ;
  } else if (period === "prev_month") {
    const { start, end } = startOfPrevMonthUTC(new Date());
    from = dayKeyFromUTCDate(start);
    to = dayKeyFromUTCDate(end);
  } else {
    // fallback: rolling 30d
    const now = new Date();
    const toD = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const fromD = new Date(toD);
    fromD.setUTCDate(fromD.getUTCDate() - 29);
    from = dayKeyFromUTCDate(fromD);
    to = dayKeyFromUTCDate(toD);
  }

  const { db } = await connectToDatabase();
  const col = db.collection("trading");

  // Load Game Library (A/B/C factors) - include archived=false, active=true
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

  // --- Pull source docs within range ---
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

  // 1) Trades in range
  const trades = tradesAll
    .map((t) => {
      const day = toDateOnly(t.date) || toDateOnly(t.createdAt);
      return { ...t, _day: day };
    })
    .filter((t) => t._day && inRange((t as any)._day, from, to));

  // 2) Setups in range (executed-only: status === "active")
  const executed = setupsAll
    .map((s) => {
      const day = toDateOnly(s.createdAt) || toDateOnly(s.updatedAt);
      return { ...s, _day: day };
    })
    .filter((s) => (s as any)._day && inRange((s as any)._day, from, to))
    .filter((s) => String(s.status ?? "").toLowerCase() === "active");

  // 3) Day Reflections in range
  const days = daysAll.filter((d) => d.date && inRange(d.date, from, to));

  const totals = {
    trade: trades.length,
    setup: executed.length,
    reflection: days.length,
  };

  // Count occurrences per scope
  const countsByScope: Record<Exclude<Scope, "all">, Map<string, number>> = {
    trade: new Map(),
    setup: new Map(),
    reflection: new Map(),
  };

  for (const t of trades) {
    const ids = uniqStrings((t as any).tradeSelectedIds) ?? [];
    for (const id of ids) {
      const meta = libMap.get(id);
      if (!meta) continue;
      if (meta.scope !== "trade") continue;
      countsByScope.trade.set(id, (countsByScope.trade.get(id) ?? 0) + 1);
    }
  }

  for (const s of executed) {
    const ids = uniqStrings((s as any).setupSelectedIds) ?? [];
    for (const id of ids) {
      const meta = libMap.get(id);
      if (!meta) continue;
      if (meta.scope !== "setup") continue;
      countsByScope.setup.set(id, (countsByScope.setup.get(id) ?? 0) + 1);
    }
  }

  for (const d of days) {
    const ids =
      uniqStrings((d as any).reflectionSelectedIds) ??
      uniqStrings((d as any).reflectionGame?.selectedIds) ??
      [];
    for (const id of ids) {
      const meta = libMap.get(id);
      if (!meta) continue;
      if (meta.scope !== "reflection") continue;
      countsByScope.reflection.set(id, (countsByScope.reflection.get(id) ?? 0) + 1);
    }
  }

  function buildRows(forScope: Exclude<Scope, "all">): FactorRow[] {
    const total = totals[forScope] || 0;
    const out: FactorRow[] = [];

    for (const [id, count] of countsByScope[forScope].entries()) {
      const meta = libMap.get(id);
      if (!meta) continue;

      // ✅ baseline: must occur at least minCount times
      if (count < minCount) continue;

      const rate = total > 0 ? count / total : 0;

      const row: FactorRow = {
        id,
        label: meta.label,
        scope: forScope,
        grade: meta.grade,
        count,
        rate: +rate.toFixed(4),
      };

      // attach targets for UI convenience
      if (row.grade === "A" && minAVal != null) {
        row.targetMin = minAVal;
        row.outOfTarget = row.count < minAVal;
        row.deltaToTarget = row.count < minAVal ? minAVal - row.count : 0;
      }
      if (row.grade === "C" && maxCVal != null) {
        row.targetMax = maxCVal;
        row.outOfTarget = row.count > maxCVal;
        row.deltaToTarget = row.count > maxCVal ? row.count - maxCVal : 0;
      }

      out.push(row);
    }

    return out;
  }

  const allRows: FactorRow[] = [];
  if (scope === "all" || scope === "trade") allRows.push(...buildRows("trade"));
  if (scope === "all" || scope === "setup") allRows.push(...buildRows("setup"));
  if (scope === "all" || scope === "reflection") allRows.push(...buildRows("reflection"));

  const cRows = allRows.filter((r) => r.grade === "C");
  const aRows = allRows.filter((r) => r.grade === "A");

  // ✅ C hot:
  // - if maxC provided: focus on OUT-OF-TARGET items (count > maxC), sorted by delta desc
  // - else: top by metric desc
  let cHot = cRows
    .filter((r) => (maxCVal != null ? r.count > maxCVal : true))
    .sort((a, b) => {
      if (maxCVal != null) {
        const da = a.deltaToTarget ?? 0;
        const db = b.deltaToTarget ?? 0;
        if (db !== da) return db - da;
      }
      return (b[sortMetric] as number) - (a[sortMetric] as number);
    })
    .slice(0, topN);

  // ✅ A weak:
  // - if minA provided: focus on OUT-OF-TARGET items (count < minA), sorted by delta desc (most missing first)
  // - else: lowest by metric asc
  let aWeak = aRows
    .filter((r) => (minAVal != null ? r.count < minAVal : true))
    .sort((a, b) => {
      if (minAVal != null) {
        const da = a.deltaToTarget ?? 0;
        const db = b.deltaToTarget ?? 0;
        if (db !== da) return db - da;
      }
      return (a[sortMetric] as number) - (b[sortMetric] as number);
    })
    .slice(0, topN);

  const payload: any = {
    ok: true,
    mode,
    scope,
    metric: sortMetric,
    top: topN,
    minCount,
    thresholds: {
      minA: minAVal ?? null,
      maxC: maxCVal ?? null,
    },
    range: {
      period,
      from,
      to,
    },
    totals: {
      trades: totals.trade,
      executedSetups: totals.setup,
      dayReflections: totals.reflection,
    },
    // Always include count+rate in rows so UI can toggle without refetch
    lists: {
      c_hot: mode === "a_weak" ? [] : cHot,
      a_weak: mode === "c_hot" ? [] : aWeak,
    },
    meta: {
      durationMs: Date.now() - startedAt,
    },
  };

  return res.status(200).json(payload);
}
