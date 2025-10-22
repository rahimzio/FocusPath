// pages/api/trading/stats.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { connectToDatabase } from "../db/mongo";

type CountBE = "neutral" | "win" | "loss";

type RateBlock = {
  key: string;
  label: string;
  trades: number;
  wins: number;
  losses: number;
  be: number;
  winRate: number;   // 0..1
  pnl?: number;      // sum
  avgR?: number;     // realized R (pnl / potentialLoss)
  expectancyR?: number;
  plannedRRAvg?: number;
};

type TrendPoint = { date: string; trades: number; pnl: number; cumPnl: number; };

type StatsResponse = {
  kpis: {
    trades: number;
    winRate: number;
    pnl: number;
    maxDD: number;
    bestPair?: { pair: string; trades: number; winRate: number };
    disciplineAvg?: number;            // optional, falls Feld existiert
    strategyYesPct?: number;           // Anteil strategyAdherence === "yes"
    processAdherenceAvg?: number;      // optional, falls Feld existiert
    plannedRRAvg?: number;             // aus riskReward
    realizedRAvg?: number;             // aus pnl/potentialLoss
  };
  avgTradesPer: {
    perCalendarDay: number;
    perCalendarWeek: number;
    perCalendarMonth: number;
  };
  byPair: RateBlock[];
  byStrategy: RateBlock[];
  byDow: RateBlock[];        // Mon..Sun
  bySession: RateBlock[];    // Asia/London/NewYork/Overlap
  byHalfHour: RateBlock[];   // HH:mm (Start des 30-Min-Slots)
  trendDaily: TrendPoint[];
};

const clampCountBE = (v: any): CountBE => {
  const s = String(v ?? "neutral").toLowerCase();
  return s === "win" || s === "loss" ? s : "neutral";
};

const parseDate10 = (s?: string) => (s || "").slice(0, 10);

const parseRiskReward = (rr?: string): number | undefined => {
  if (!rr) return undefined;
  const t = rr.trim();
  // gängig: "1:2.5" oder "1 : 2.00"
  const m = t.match(/^\s*([\d.]+)\s*:\s*([\d.]+)\s*$/);
  if (m) {
    const left = Number(m[1]);
    const right = Number(m[2]);
    if (Number.isFinite(left) && left > 0 && Number.isFinite(right)) {
      // normalisiere auf "pro 1 Risiko"
      return right / left;
    }
  }
  // wenn nur Zahl, akzeptiere direkt
  const n = Number(t);
  if (Number.isFinite(n)) return n;
  return undefined;
};

const toNum = (v: any, def?: number) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : def ?? undefined;
};

const isStr = (v: any): v is string => typeof v === "string";

const dayOfWeek = (date10?: string) => {
  // 0..6 => So..Sa (UTC); wir mappen danach auf Mon..Sun
  if (!date10) return undefined;
  const d = new Date(date10 + "T00:00:00.000Z");
  return d.getUTCDay(); // 0=So
};

function labelDow(d: number | undefined) {
  const map = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];
  return d === undefined ? "-" : map[d];
}

function halfHourBucket(hhmm?: string) {
  if (!isStr(hhmm) || !/^\d{2}:\d{2}$/.test(hhmm)) return undefined;
  const [h, m] = hhmm.split(":").map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return undefined;
  const total = h * 60 + m;
  const bucketMin = Math.floor(total / 30) * 30;
  const H = String(Math.floor(bucketMin / 60)).padStart(2, "0");
  const M = String(bucketMin % 60).padStart(2, "0");
  return `${H}:${M}`;
}

function calcMaxDrawdown(points: TrendPoint[]) {
  let peak = 0;
  let maxDD = 0;
  for (const p of points) {
    if (p.cumPnl > peak) peak = p.cumPnl;
    const dd = peak - p.cumPnl;
    if (dd > maxDD) maxDD = dd;
  }
  return maxDD;
}

function diffDaysInclusive(a: string, b: string) {
  const A = new Date(a + "T00:00:00Z").getTime();
  const B = new Date(b + "T00:00:00Z").getTime();
  const ms = Math.max(0, B - A);
  return Math.floor(ms / 86400000) + 1;
}

function countCalendarWeeks(a: string, b: string) {
  return Math.max(1, Math.round(diffDaysInclusive(a, b) / 7));
}

function countCalendarMonths(a: string, b: string) {
  const [ay, am] = a.split("-").map(Number);
  const [by, bm] = b.split("-").map(Number);
  return Math.max(1, (by - ay) * 12 + (bm - am) + 1);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { db } = await connectToDatabase();
    const col = db.collection("trading");

    const {
      userId,
      from,
      to,
      accountId,
      includeDrafts,
      countBE,
      session,     // optional filter
      symbol,      // optional filter
      strategy,    // optional filter
      minTradesForBestPair = "10",
    } = req.query as Record<string, string | undefined>;

    if (!userId) return res.status(400).json({ error: "userId ist erforderlich" });

    const includeDraftsBool = includeDrafts === "true";
    const beHandling: CountBE = clampCountBE(countBE);
    const fromD = parseDate10(from) || new Date(Date.now() - 90 * 86400000).toISOString().slice(0, 10);
    const toD = parseDate10(to) || new Date().toISOString().slice(0, 10);
    const minBestPair = Math.max(1, Number(minTradesForBestPair) || 10);

    const match: any = {
      userId,
      deleted: { $ne: true },
      archived: { $ne: true },
      type: "tradeEntry",
      date: { $gte: fromD, $lte: toD },
    };
    if (!includeDraftsBool) match.status = "final";
    if (accountId) match.accountId = accountId;
    if (session) match.session = session;
    if (symbol) match.symbol = symbol;
    if (strategy) {
      // wir filtern über beide Felder (normalize client-seitig sowieso)
      match.$or = [
        { strategy },
        { strategy_name: strategy },
      ];
    }

    const fields = await col
      .find(match, {
        projection: {
          date: 1,
          symbol: 1,
          session: 1,
          pnl: 1,
          result: 1,
          potentialLoss: 1,
          riskReward: 1,
          startTime: 1,
          entryTime: 1,
          strategy: 1,
          strategy_name: 1,
          disciplineScore: 1,
          strategyAdherence: 1,     // "yes" | "partial" | "no"
          processAdherence: 1,      // number 0..100 (optional)
          createdAt: 1,
        },
      })
      .toArray();

    // --- aggregieren im Code ---
    type Doc = typeof fields[number];

    const kpi = {
      trades: 0, win: 0, loss: 0, be: 0,
      pnl: 0,
      plannedRRs: [] as number[],
      realizedRs: [] as number[],
      discipline: [] as number[],
      strategyYes: 0, strategyTotal: 0,
      processAdh: [] as number[],
    };

    const group = (key: string) => ({
      key,
      label: key,
      trades: 0, wins: 0, losses: 0, be: 0,
      pnl: 0,
      plannedRRs: [] as number[],
      realizedRs: [] as number[],
    });

    const byPair = new Map<string, ReturnType<typeof group>>();
    const byStrategy = new Map<string, ReturnType<typeof group>>();
    const byDow = new Map<string, ReturnType<typeof group>>();
    const bySession = new Map<string, ReturnType<typeof group>>();
    const byHalfHour = new Map<string, ReturnType<typeof group>>();

    const dailyMap = new Map<string, { pnl: number; trades: number }>();

    const normStrategy = (d: Doc) => {
      const s1 = isStr(d.strategy_name) ? d.strategy_name.trim() : "";
      const s2 = isStr(d.strategy) ? d.strategy.trim() : "";
      return s1 || s2 || "-";
    };

    const considerBE = (r?: string) => {
      if (!r) return undefined;
      if (r === "win" || r === "loss") return r;
      if (r === "BE") {
        if (beHandling === "win") return "win";
        if (beHandling === "loss") return "loss";
        return "BE";
      }
      return undefined;
    };

    const sortedForTrend = [...fields].sort((a, b) => {
      const da = String(a.date || "");
      const db = String(b.date || "");
      if (da !== db) return da < db ? -1 : 1;
      const ca = String(a.createdAt || "");
      const cb = String(b.createdAt || "");
      return ca < cb ? -1 : (ca > cb ? 1 : 0);
    });

    for (const d of fields) {
      const date10 = String(d.date || "").slice(0, 10);
      const symbol = String(d.symbol || "-");
      const strategyName = normStrategy(d);
      const session = String(d.session || "-");

      const res = considerBE(d.result);
      const pnl = toNum(d.pnl, 0) ?? 0;
      const pot = toNum(d.potentialLoss);
      const planned = parseRiskReward(isStr(d.riskReward) ? d.riskReward : undefined);
      const realR = (pot && pot > 0) ? (pnl / pot) : undefined;

      const timeSrc = isStr(d.startTime) ? d.startTime : (isStr(d.entryTime) ? d.entryTime : undefined);
      const hh = halfHourBucket(timeSrc);

      // KPIs (gesamt)
      kpi.trades++;
      if (res === "win") kpi.win++;
      else if (res === "loss") kpi.loss++;
      else kpi.be++;
      kpi.pnl += pnl;
      if (Number.isFinite(planned!)) kpi.plannedRRs.push(planned!);
      if (Number.isFinite(realR!)) kpi.realizedRs.push(realR!);
      if (Number.isFinite(d.disciplineScore as any)) kpi.discipline.push(Number(d.disciplineScore));
      if (isStr(d.strategyAdherence)) {
        kpi.strategyTotal++;
        if (String(d.strategyAdherence) === "yes") kpi.strategyYes++;
      }
      if (Number.isFinite(d.processAdherence as any)) kpi.processAdh.push(Number(d.processAdherence));

      // byPair
      if (!byPair.has(symbol)) byPair.set(symbol, group(symbol));
      const gp = byPair.get(symbol)!;
      gp.trades++; gp.pnl += pnl;
      if (res === "win") gp.wins++; else if (res === "loss") gp.losses++; else gp.be++;
      if (Number.isFinite(planned!)) gp.plannedRRs.push(planned!);
      if (Number.isFinite(realR!)) gp.realizedRs.push(realR!);

      // byStrategy
      if (!byStrategy.has(strategyName)) byStrategy.set(strategyName, group(strategyName));
      const gs = byStrategy.get(strategyName)!;
      gs.trades++; gs.pnl += pnl;
      if (res === "win") gs.wins++; else if (res === "loss") gs.losses++; else gs.be++;
      if (Number.isFinite(planned!)) gs.plannedRRs.push(planned!);
      if (Number.isFinite(realR!)) gs.realizedRs.push(realR!);

      // bySession
      if (!bySession.has(session)) bySession.set(session, group(session));
      const gse = bySession.get(session)!;
      gse.trades++; gse.pnl += pnl;
      if (res === "win") gse.wins++; else if (res === "loss") gse.losses++; else gse.be++;
      if (Number.isFinite(planned!)) gse.plannedRRs.push(planned!);
      if (Number.isFinite(realR!)) gse.realizedRs.push(realR!);

      // byDow
      const dow = dayOfWeek(date10); // 0..6
      const keyDow = labelDow(dow);
      if (!byDow.has(keyDow)) byDow.set(keyDow, group(keyDow));
      const gd = byDow.get(keyDow)!;
      gd.trades++; gd.pnl += pnl;
      if (res === "win") gd.wins++; else if (res === "loss") gd.losses++; else gd.be++;
      if (Number.isFinite(planned!)) gd.plannedRRs.push(planned!);
      if (Number.isFinite(realR!)) gd.realizedRs.push(realR!);

      // byHalfHour
      if (hh) {
        if (!byHalfHour.has(hh)) byHalfHour.set(hh, group(hh));
        const gh = byHalfHour.get(hh)!;
        gh.trades++; gh.pnl += pnl;
        if (res === "win") gh.wins++; else if (res === "loss") gh.losses++; else gh.be++;
        if (Number.isFinite(planned!)) gh.plannedRRs.push(planned!);
        if (Number.isFinite(realR!)) gh.realizedRs.push(realR!);
      }

      // daily bucket
      if (!dailyMap.has(date10)) dailyMap.set(date10, { pnl: 0, trades: 0 });
      const dm = dailyMap.get(date10)!;
      dm.pnl += pnl; dm.trades++;
    }

    const finalizeBlock = (m: Map<string, any>): RateBlock[] => {
      const out: RateBlock[] = [];
      for (const [key, v] of m) {
        const denom = v.trades - (beHandling === "neutral" ? v.be : 0);
        const winsAdj = v.wins + (beHandling === "win" ? v.be : 0);
        const lossesAdj = v.losses + (beHandling === "loss" ? v.be : 0);
        const wr = denom > 0 ? winsAdj / denom : 0;

        const rAvg = v.realizedRs.length ? (v.realizedRs.reduce((a: number, b: number) => a + b, 0) / v.realizedRs.length) : undefined;
        const plannedAvg = v.plannedRRs.length ? (v.plannedRRs.reduce((a: number, b: number) => a + b, 0) / v.plannedRRs.length) : undefined;

        // Expectancy R (nur wenn realizedRs vorhanden): avg(realizedR)
        const expectancyR = rAvg;

        out.push({
          key,
          label: key,
          trades: v.trades,
          wins: v.wins,
          losses: v.losses,
          be: v.be,
          pnl: v.pnl,
          winRate: wr,
          avgR: rAvg,
          expectancyR,
          plannedRRAvg: plannedAvg,
        });
      }
      return out;
    };

    const byPairArr = finalizeBlock(byPair).sort((a, b) => b.trades - a.trades);
    const byStrategyArr = finalizeBlock(byStrategy).sort((a, b) => b.trades - a.trades);
    // DOW sort: Mo..So => 1..6,0
    const dowOrder = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
    const byDowArr = finalizeBlock(byDow).sort((a, b) => dowOrder.indexOf(a.key) - dowOrder.indexOf(b.key));
    // Half-hour chronological
    const byHalfHourArr = finalizeBlock(byHalfHour).sort((a, b) => a.key.localeCompare(b.key));
    const bySessionArr = finalizeBlock(bySession);

    // Trend
    let cum = 0;
    const trendDaily: TrendPoint[] = [...dailyMap.entries()]
      .sort((a, b) => a[0] < b[0] ? -1 : 1)
      .map(([d, v]) => {
        cum += v.pnl;
        return { date: d, pnl: v.pnl, trades: v.trades, cumPnl: cum };
      });

    // KPIs final
    const denom = kpi.trades - (beHandling === "neutral" ? kpi.be : 0);
    const winsAdj = kpi.win + (beHandling === "win" ? kpi.be : 0);
    const winRate = denom > 0 ? winsAdj / denom : 0;
    const plannedRRAvg = kpi.plannedRRs.length ? (kpi.plannedRRs.reduce((a, b) => a + b, 0) / kpi.plannedRRs.length) : undefined;
    const realizedRAvg = kpi.realizedRs.length ? (kpi.realizedRs.reduce((a, b) => a + b, 0) / kpi.realizedRs.length) : undefined;

    const maxDD = calcMaxDrawdown(trendDaily);
    const bestPair = byPairArr
      .filter((p) => p.trades >= minBestPair)
      .sort((a, b) => b.winRate - a.winRate)[0];

    // Averages pro Kalenderperiode
    const days = diffDaysInclusive(fromD, toD);
    const weeks = countCalendarWeeks(fromD, toD);
    const months = countCalendarMonths(fromD, toD);
    const avgTradesPer = {
      perCalendarDay: Number((kpi.trades / days).toFixed(2)),
      perCalendarWeek: Number((kpi.trades / weeks).toFixed(2)),
      perCalendarMonth: Number((kpi.trades / months).toFixed(2)),
    };

    const resp: StatsResponse = {
      kpis: {
        trades: kpi.trades,
        winRate,
        pnl: kpi.pnl,
        maxDD,
        bestPair: bestPair ? { pair: bestPair.key, trades: bestPair.trades, winRate: bestPair.winRate } : undefined,
        disciplineAvg: kpi.discipline.length ? (kpi.discipline.reduce((a, b) => a + b, 0) / kpi.discipline.length) : undefined,
        strategyYesPct: kpi.strategyTotal > 0 ? (kpi.strategyYes / kpi.strategyTotal) : undefined,
        processAdherenceAvg: kpi.processAdh.length ? (kpi.processAdh.reduce((a, b) => a + b, 0) / kpi.processAdh.length) : undefined,
        plannedRRAvg,
        realizedRAvg,
      },
      avgTradesPer,
      byPair: byPairArr,
      byStrategy: byStrategyArr,
      byDow: byDowArr,
      bySession: bySessionArr,
      byHalfHour: byHalfHourArr,
      trendDaily,
    };

    return res.status(200).json(resp);
  } catch (e: any) {
    console.error("❌ /api/trading/stats error:", e?.message || e);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
