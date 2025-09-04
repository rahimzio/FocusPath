"use client";

import React from "react";
import useSWR, { useSWRConfig } from "swr";
import {
  Card, CardHeader, CardTitle, CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import TradeEntryForm from "./TradeEntryForm";
import { cn } from "@/lib/utils";

type BiasExec = "RR" | "RW" | "WR" | "WW";
type Result = "win" | "loss" | "BE";
type Grade = "A" | "B" | "C";
type All = "ALL";

const SESSION_OPTIONS = ["Asia", "London", "NewYork", "Overlap"] as const;
type SessionKey = typeof SESSION_OPTIONS[number];

type Concept = {
  name: string;
  direction?: "bullish" | "bearish" | "neutral";
  timeframe: string;
  note?: string;
};
type OutcomeFlags = { breakEven?: boolean; stopHit?: boolean };

type Trade = {
  _id: string;
  date: string;
  symbol: string;
  result: Result;
  pnl: number;
  startTime?: string;
  endTime?: string;
  durationMin?: number;
  session?: SessionKey;
  outcomeFlags?: OutcomeFlags;
  biasExecution?: BiasExec;
  tradingMistakes?: string[];
  viewTimeframes?: string[];
  entryTimeframe?: string;

  // Anzeige
  strategy?: string;
  riskReward?: string | number;
  confluences?: string[];

  // RR-Fallback Inputs
  entry?: number;
  stopPrice?: number;
  targetPrice?: number;
  tradeType?: "buy" | "sell";

  // (nicht mehr angezeigt, aber evtl. vorhanden)
  concepts?: Concept[];
  location?: string;
  rangeDefined?: boolean;
  rangeNote?: string;

  gameComputed?: Grade;
  gameSelf?: Grade;

  status?: "draft" | "final";
  completed?: boolean;
  missing?: string[];
  accountId?: string;
};

type Account = { _id: string; name?: string; currency?: string };

const fetcher = (url: string) => fetch(url).then((r) => r.json());
const STORAGE_KEY = "recapFilters_v3";

/* UI helpers */
function BiasBadge({ v }: { v?: BiasExec }) {
  const map: Record<BiasExec, string> = {
    RR: "Right Bias • Right Execution",
    RW: "Right Bias • Wrong Execution",
    WR: "Wrong Bias • Right Execution",
    WW: "Wrong Bias • Wrong Execution",
  };
  if (!v) return null;
  return <Badge variant="outline">{map[v]}</Badge>;
}
function resultBadgeProps(result: Result) {
  switch (result) {
    case "win":
      return { variant: "default" as const, className: undefined };
    case "BE":
      return { variant: "secondary" as const, className: undefined };
    case "loss":
      return { variant: "outline" as const, className: "border-rose-500 text-rose-600" };
  }
}
function GameBadge({ computed, self }: { computed?: Grade; self?: Grade }) {
  const color = computed === "A" ? "bg-emerald-600" : computed === "B" ? "bg-amber-600" : "bg-rose-600";
  return (
    <div className="flex items-center gap-2">
      {computed ? <Badge className={cn("text-white", color)}>Game: {computed}</Badge> : null}
      {self ? <Badge variant="secondary">Self: {self}</Badge> : null}
    </div>
  );
}
function currencySymbol(cur?: string) {
  if (!cur) return "";
  const c = cur.toUpperCase();
  if (c === "EUR" || c === "€") return "€";
  if (c === "USD" || c === "$") return "$";
  if (c === "GBP" || c === "£") return "£";
  return c;
}

/** Dauer aus HH:mm → Minuten (robust, auch über Mitternacht) */
function minutesBetween(start?: string, end?: string) {
  if (!start || !end) return 0;
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  if ([sh, sm, eh, em].some((n) => Number.isNaN(n))) return 0;
  const sTotal = sh * 60 + sm;
  const eTotal = eh * 60 + em;
  return eTotal >= sTotal ? (eTotal - sTotal) : (eTotal + 1440 - sTotal);
}

/** RR-Fallback bei fehlendem riskReward-String */
function computeRR(
  entry?: number,
  stop?: number,
  target?: number,
  tradeType?: "buy" | "sell"
): number | null {
  if (
    typeof entry !== "number" ||
    typeof stop !== "number" ||
    typeof target !== "number" ||
    !tradeType
  ) return null;

  const isBuy = tradeType === "buy";
  const risk = isBuy ? (entry - stop) : (stop - entry);
  const reward = isBuy ? (target - entry) : (entry - target);

  if (!(risk > 0) || !(reward > 0)) return null;
  return reward / risk;
}

/* Datum/Monat helpers */
function yyyymm(d: Date) {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}
function firstOfMonth(ym: string) {
  return `${ym}-01`;
}
function lastOfMonth(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  const last = new Date(Date.UTC(y, m, 0));
  const dd = String(last.getUTCDate()).padStart(2, "0");
  return `${ym}-${dd}`;
}

export default function TradeRecapList({ userId }: { userId: string }) {
  const { mutate } = useSWRConfig();

  // Accounts (für Währungs-Badge)
  const { data: accData } = useSWR<{ accounts: Account[] }>(
    userId ? `/api/trading/getAllAccounts?userId=${userId}` : null,
    fetcher
  );
  const accountMap = React.useMemo(() => {
    const map = new Map<string, Account>();
    (accData?.accounts ?? []).forEach((a) => map.set(a._id, a));
    return map;
  }, [accData]);

  // Filter
  const [accountFilter, setAccountFilter] = React.useState<string | All>("ALL");
  const [strategyFilter, setStrategyFilter] = React.useState<string | All>("ALL");
  const [monthFilter, setMonthFilter] = React.useState<string | All>("ALL");
  const [sessionFilter, setSessionFilter] = React.useState<SessionKey | All>("ALL");
  const [biasFilter, setBiasFilter] = React.useState<BiasExec | All>("ALL");
  const [resultFilter, setResultFilter] = React.useState<Result | All>("ALL");
  const [gradeFilter, setGradeFilter] = React.useState<Grade | All>("ALL");
  const [mistakeQuery, setMistakeQuery] = React.useState("");
  const [onlyDrafts, setOnlyDrafts] = React.useState(false);

  const [disableNext, setDisableNext] = React.useState(false);

  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const s = JSON.parse(raw) ?? {};
      if (s.accountFilter) setAccountFilter(s.accountFilter);
      if (s.strategyFilter) setStrategyFilter(s.strategyFilter);
      if (s.monthFilter) setMonthFilter(s.monthFilter);
      if (s.sessionFilter) setSessionFilter(s.sessionFilter);
      if (s.biasFilter) setBiasFilter(s.biasFilter);
      if (s.resultFilter) setResultFilter(s.resultFilter);
      if (s.gradeFilter) setGradeFilter(s.gradeFilter);
      if (typeof s.mistakeQuery === "string") setMistakeQuery(s.mistakeQuery);
      if (typeof s.onlyDrafts === "boolean") setOnlyDrafts(s.onlyDrafts);
    } catch {}
  }, []);

  React.useEffect(() => {
    try {
      const url = new URL(window.location.href);
      const acc = url.searchParams.get("account");
      const strat = url.searchParams.get("strategy");
      if (acc) setAccountFilter(acc);
      if (strat) setStrategyFilter(strat);

      const gUrl = url.searchParams.get("grade");
      if (gUrl === "A" || gUrl === "B" || gUrl === "C") setGradeFilter(gUrl as Grade);

      const from = url.searchParams.get("from");
      const to = url.searchParams.get("to");
      if (from && to) {
        const ym = from.slice(0, 7);
        setMonthFilter(ym);
        setDisableNext(ym === yyyymm(new Date()));
      }

      const onAccount = (e: any) => {
        const id = e?.detail?.accountId || undefined;
        setAccountFilter(id ?? "ALL");
        const u = new URL(window.location.href);
        if (id) u.searchParams.set("account", id);
        else u.searchParams.delete("account");
        window.history.replaceState({}, "", u.toString());
      };
      const onStrategy = (e: any) => {
        const name = e?.detail?.name || undefined;
        setStrategyFilter(name ?? "ALL");
        const u = new URL(window.location.href);
        if (name) u.searchParams.set("strategy", name);
        else u.searchParams.delete("strategy");
        window.history.replaceState({}, "", u.toString());
      };
      window.addEventListener("account-change", onAccount as EventListener);
      window.addEventListener("strategy-select", onStrategy as EventListener);
      return () => {
        window.removeEventListener("account-change", onAccount as EventListener);
        window.removeEventListener("strategy-select", onStrategy as EventListener);
      };
    } catch {}
  }, []);

  React.useEffect(() => {
    const state = {
      accountFilter, strategyFilter, monthFilter,
      sessionFilter, biasFilter, resultFilter, gradeFilter,
      mistakeQuery, onlyDrafts,
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      const url = new URL(window.location.href);
      if (gradeFilter !== "ALL") url.searchParams.set("grade", gradeFilter);
      else url.searchParams.delete("grade");
      window.history.replaceState({}, "", url.toString());
    } catch {}
  }, [accountFilter, strategyFilter, monthFilter, sessionFilter, biasFilter, resultFilter, gradeFilter, mistakeQuery, onlyDrafts]);

  // Server-Filter (SWR-Key)
  const recentKey = React.useMemo(() => {
    if (!userId) return null;

    let fromParam: string | null = null;
    let toParam: string | null = null;

    try {
      const u = new URL(window.location.href);
      const urlFrom = u.searchParams.get("from");
      const urlTo = u.searchParams.get("to");
      if (urlFrom && urlTo) {
        fromParam = urlFrom;
        toParam = urlTo;
      }
    } catch {}

    if (monthFilter !== "ALL") {
      const ym = String(monthFilter);
      fromParam = firstOfMonth(ym);
      toParam = lastOfMonth(ym);
    }

    const parts = [
      `userId=${encodeURIComponent(userId)}`,
      `limit=200`,
      accountFilter !== "ALL" ? `accountId=${encodeURIComponent(accountFilter)}` : null,
      strategyFilter !== "ALL" ? `strategy=${encodeURIComponent(String(strategyFilter))}` : null,
      fromParam ? `from=${encodeURIComponent(fromParam)}` : null,
      toParam ? `to=${encodeURIComponent(toParam)}` : null,
    ].filter(Boolean);

    return `/api/trading/getRecent?${parts.join("&")}`;
  }, [userId, accountFilter, strategyFilter, monthFilter]);

  const { data, error } = useSWR<{ trades: Trade[]; nextCursor?: string | null }>(recentKey, fetcher);

  // Clientseitige Filter
  const trades = React.useMemo(() => {
    if (!data?.trades) return [];
    return data.trades.filter((t) => {
      if (onlyDrafts && (t.status ?? (t.completed ? "final" : "draft")) !== "draft") return false;
      if (sessionFilter !== "ALL" && t.session !== sessionFilter) return false;
      if (biasFilter !== "ALL" && t.biasExecution !== biasFilter) return false;
      if (resultFilter !== "ALL" && t.result !== resultFilter) return false;
      if (gradeFilter !== "ALL" && t.gameComputed !== gradeFilter) return false;
      if (mistakeQuery) {
        const q = mistakeQuery.toLowerCase();
        const has = (t.tradingMistakes || []).some((m) => m.toLowerCase().includes(q));
        if (!has) return false;
      }
      if (accountFilter !== "ALL" && t.accountId && t.accountId !== accountFilter) return false;
      if (strategyFilter !== "ALL" && t.strategy && t.strategy !== strategyFilter) return false;
      return true;
    });
  }, [data, onlyDrafts, sessionFilter, biasFilter, resultFilter, gradeFilter, mistakeQuery, accountFilter, strategyFilter]);

  const draftCount = React.useMemo(
    () => (data?.trades ?? []).filter((t) => (t.status ?? (t.completed ? "final" : "draft")) === "draft").length,
    [data?.trades]
  );

  const monthOptionsDerived = React.useMemo(() => {
    const set = new Set<string>();
    for (const t of data?.trades ?? []) {
      if (t.date) set.add(t.date.slice(0, 7));
    }
    return Array.from(set).sort((a, b) => (a < b ? 1 : -1));
  }, [data?.trades]);

  const applyMonthToUrl = (ym: string | null) => {
    try {
      const url = new URL(window.location.href);
      if (ym) {
        url.searchParams.set("from", firstOfMonth(ym));
        url.searchParams.set("to", lastOfMonth(ym));
      } else {
        url.searchParams.delete("from");
        url.searchParams.delete("to");
      }
      window.history.replaceState({}, "", url.toString());
    } catch {}
  };

  const stepMonth = (delta: number) => {
    const base = monthFilter === "ALL" ? yyyymm(new Date()) : String(monthFilter);
    const [y, m] = base.split("-").map(Number);
    const d = new Date(Date.UTC(y, m - 1, 1));
    d.setUTCMonth(d.getUTCMonth() + delta);
    const ym = yyyymm(d);
    setMonthFilter(ym);
    setDisableNext(ym === yyyymm(new Date()));
    applyMonthToUrl(ym);
  };

  const clearMonth = () => {
    setMonthFilter("ALL");
    setDisableNext(false);
    applyMonthToUrl(null);
  };

  // Edit-Dialog
  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Trade | null>(null);
  const onEdit = (t: Trade) => { setEditing(t); setOpen(true); };
  const handleClose = () => { setOpen(false); setEditing(null); };
  const handleUpdated = async () => {
    handleClose();
    if (recentKey) await mutate(recentKey);
  };

  const onAccountSelect = (val: string | All) => {
    setAccountFilter(val);
    try {
      const url = new URL(window.location.href);
      if (val !== "ALL") url.searchParams.set("account", String(val));
      else url.searchParams.delete("account");
      window.history.replaceState({}, "", url.toString());
    } catch {}
    window.dispatchEvent(new CustomEvent("account-change", { detail: { accountId: val === "ALL" ? null : val } }));
  };
  const onStrategySelect = (val: string | All) => {
    setStrategyFilter(val);
    try {
      const url = new URL(window.location.href);
      if (val !== "ALL") url.searchParams.set("strategy", String(val));
      else url.searchParams.delete("strategy");
      window.history.replaceState({}, "", url.toString());
    } catch {}
    window.dispatchEvent(new CustomEvent("strategy-select", { detail: { name: val === "ALL" ? null : val } }));
  };

  if (error) return <div className="text-red-600">Fehler beim Laden.</div>;
  if (!data) return <div className="opacity-70">Lade…</div>;

  return (
    <>
      <Card>
        {/* Header + Filter */}
        <CardHeader className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <CardTitle>Trade Recap</CardTitle>

            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => stepMonth(-1)}>◀ Voriger Monat</Button>
              <Button variant={monthFilter === "ALL" ? "default" : "outline"} size="sm" onClick={clearMonth}>
                Alle Monate
              </Button>
              <Button variant="outline" size="sm" onClick={() => stepMonth(+1)} disabled={disableNext}>
                Nächster Monat ▶
              </Button>
              <Button variant="secondary" size="sm" onClick={() => {
                const ym = yyyymm(new Date());
                setMonthFilter(ym);
                setDisableNext(true);
                applyMonthToUrl(ym);
              }}>
                Dieser Monat
              </Button>
              <Button variant="secondary" size="sm" onClick={() => {
                setSessionFilter("ALL");
                setBiasFilter("ALL");
                setResultFilter("ALL");
                setGradeFilter("ALL");
                setMistakeQuery("");
                setOnlyDrafts(false);
              }}>
                Filter zurücksetzen
              </Button>
              <Badge variant={draftCount > 0 ? "secondary" : "outline"} title="Anzahl unvollständiger Trades">
                Entwürfe: {draftCount}
              </Badge>
              <Button
                variant={onlyDrafts ? "default" : "outline"}
                size="sm"
                onClick={() => setOnlyDrafts(v => !v)}
                title="Zeige nur unvollständige (Entwurf) Trades"
              >
                {onlyDrafts ? "Nur Entwürfe ✓" : "Nur Entwürfe"}
              </Button>
            </div>
          </div>

          {/* Filterleiste */}
          <div className="mt-3 flex flex-wrap gap-2">
            {/* Account */}
            <Select value={accountFilter} onValueChange={(v) => onAccountSelect(v as string | All)}>
              <SelectTrigger className="w-[170px]"><SelectValue placeholder="Account" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Alle Accounts</SelectItem>
                {(accData?.accounts ?? []).map((a) => (
                  <SelectItem key={a._id} value={a._id}>{a.name || a._id}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Monat */}
            <Select
              value={monthFilter}
              onValueChange={(v) => {
                setMonthFilter(v as string | All);
                if (v === "ALL") {
                  setDisableNext(false);
                  applyMonthToUrl(null);
                } else {
                  const ym = String(v);
                  setDisableNext(ym === yyyymm(new Date()));
                  applyMonthToUrl(ym);
                }
              }}
            >
              <SelectTrigger className="w-[130px]"><SelectValue placeholder="Monat" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Alle Monate</SelectItem>
                {monthOptionsDerived.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>

            {/* Strategy */}
            <Select value={strategyFilter} onValueChange={(v) => onStrategySelect(v as string | All)}>
              <SelectTrigger className="w-[200px]"><SelectValue placeholder="Strategy" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Alle Strategien</SelectItem>
              </SelectContent>
            </Select>

            {/* Session */}
            <Select value={sessionFilter} onValueChange={(v) => setSessionFilter(v as SessionKey | All)}>
              <SelectTrigger className="w-[130px]"><SelectValue placeholder="Session" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Alle Sessions</SelectItem>
                {SESSION_OPTIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>

            {/* Bias */}
            <Select value={biasFilter} onValueChange={(v) => setBiasFilter(v as BiasExec | All)}>
              <SelectTrigger className="w-[210px]"><SelectValue placeholder="Bias/Execution" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Alle</SelectItem>
                <SelectItem value="RR">Right Bias – Right Execution</SelectItem>
                <SelectItem value="RW">Right Bias – Wrong Execution</SelectItem>
                <SelectItem value="WR">Wrong Bias – Right Execution</SelectItem>
                <SelectItem value="WW">Wrong Bias – Wrong Execution</SelectItem>
              </SelectContent>
            </Select>

            {/* Result */}
            <Select value={resultFilter} onValueChange={(v) => setResultFilter(v as Result | All)}>
              <SelectTrigger className="w-[120px]"><SelectValue placeholder="Result" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Alle</SelectItem>
                <SelectItem value="win">Win</SelectItem>
                <SelectItem value="loss">Loss</SelectItem>
                <SelectItem value="BE">BE</SelectItem>
              </SelectContent>
            </Select>

            {/* Game */}
            <Select value={gradeFilter} onValueChange={(v) => setGradeFilter(v as Grade | All)}>
              <SelectTrigger className="w-[120px]"><SelectValue placeholder="Game" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Alle</SelectItem>
                <SelectItem value="A">A</SelectItem>
                <SelectItem value="B">B</SelectItem>
                <SelectItem value="C">C</SelectItem>
              </SelectContent>
            </Select>

            <Input
              className="w-[200px]"
              placeholder="Mistake enthält…"
              value={mistakeQuery}
              onChange={(e) => setMistakeQuery(e.target.value)}
            />
          </div>
        </CardHeader>

        <CardContent>
          {!trades.length && <div className="opacity-70">Keine Trades (Filter).</div>}

          {/* Liste */}
          <div className="max-h-[600px] overflow-y-auto pr-2 space-y-6">
            {trades.map((t) => {
              // Dauer robust
              const computedDuration =
                typeof t.durationMin === "number" && t.durationMin > 0
                  ? t.durationMin
                  : minutesBetween(t.startTime, t.endTime);

              const isDraft = (t.status ?? (t.completed ? "final" : "draft")) === "draft";
              const acc = t.accountId ? accountMap.get(t.accountId) : undefined;
              const cur = currencySymbol(acc?.currency);
              const pnl = Number.isFinite(t.pnl) ? Number(t.pnl) : 0;

              // RR: String (oder Zahl) → String, sonst Fallback-Berechnung
              const rrStr = t.riskReward !== undefined && t.riskReward !== null
                ? String(t.riskReward).trim()
                : "";
              const rrFromString = rrStr.length > 0 ? rrStr : null;
              const rrComputedNum = rrFromString
                ? null
                : computeRR(t.entry, t.stopPrice, t.targetPrice, t.tradeType);
              const rrLabel = rrFromString ?? (rrComputedNum ? rrComputedNum.toFixed(2) : null);

              return (
                <div key={t._id} className="rounded-lg border p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline">{t.date}</Badge>
                      <Badge>{t.symbol}</Badge>
                      {(t.startTime || t.endTime || computedDuration > 0) ? (
                        <Badge variant="secondary">
                          {t.startTime ?? "??:??"}{(t.startTime || t.endTime) ? "–" : ""}{t.endTime ?? "??:??"}
                          {computedDuration > 0 ? ` (${computedDuration} Min)` : ""}
                        </Badge>
                      ) : null}
                      {t.session ? <Badge variant="outline">{t.session}</Badge> : null}

                      {/* Result */}
                      {(() => {
                        const { variant, className } = resultBadgeProps(t.result);
                        return (
                          <Badge variant={variant} className={className}>
                            {t.result.toUpperCase()}
                          </Badge>
                        );
                      })()}

                      {/* PnL */}
                      <Badge
                        variant={pnl >= 0 ? "secondary" : "outline"}
                        className={pnl < 0 ? "text-rose-600 border-rose-500" : ""}
                        title={acc ? `Account: ${acc.name || acc._id}` : "PnL"}
                      >
                        {pnl.toFixed(2)}{cur}
                      </Badge>

                      {isDraft && (
                        <Badge variant="outline" className="border-amber-500 text-amber-600">
                          Unvollständig
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <GameBadge computed={t.gameComputed} self={t.gameSelf} />
                      <Button
                        size="sm"
                        variant={isDraft ? "default" : "outline"}
                        onClick={() => onEdit(t)}
                        title={isDraft ? "Diesen Entwurf vervollständigen" : "Trade bearbeiten"}
                      >
                        {isDraft ? "Vervollständigen" : "Bearbeiten"}
                      </Button>
                    </div>
                  </div>

                  <Separator className="my-3" />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* Bias / Execution */}
                    <div className="space-y-2">
                      <div className="text-sm font-medium">Bias • Execution</div>
                      <BiasBadge v={t.biasExecution} />
                      <div className="flex gap-3 text-sm">
                        {t.outcomeFlags?.breakEven ? <Badge variant="outline">Break Even</Badge> : null}
                        {t.outcomeFlags?.stopHit ? <Badge variant="outline">Stop (SL/SI)</Badge> : null}
                      </div>
                    </div>

                    {/* Trading Mistakes */}
                    <div className="space-y-2">
                      <div className="text-sm font-medium">Trading Mistakes</div>
                      <div className="flex flex-wrap gap-2">
                        {(t.tradingMistakes || []).map((m) => (
                          <Badge key={m} variant="secondary">{m}</Badge>
                        ))}
                        {(!t.tradingMistakes || t.tradingMistakes.length === 0) && (
                          <div className="opacity-60 text-sm">–</div>
                        )}
                      </div>
                    </div>

                    {/* Strategie & RR & Confluences */}
                    <div className="space-y-2">
                      <div className="text-sm font-medium">Strategie & RR</div>
                      <div className="flex flex-wrap gap-2">
                        {t.strategy ? <Badge variant="outline">{t.strategy}</Badge> : null}
                        {rrLabel ? <Badge variant="secondary">RR: {rrLabel}</Badge> : null}

                        {Array.isArray(t.confluences) && t.confluences.length > 0 ? (
                          t.confluences.map((c, i) => (
                            <Badge key={`${t._id}-conf-${i}-${c}`} variant="outline">{c}</Badge>
                          ))
                        ) : (!t.strategy && !rrLabel) ? (
                          <div className="opacity-60 text-sm">–</div>
                        ) : null}
                      </div>
                    </div>

                    {/* Timeframes (gesehen) */}
                    <div className="space-y-2">
                      <div className="text-sm font-medium">Timeframes (gesehen)</div>
                      <div className="flex flex-wrap gap-2">
                        {(t.viewTimeframes || []).map((tf, i) => (
                          <Badge key={`${t._id}-tf-${i}-${tf}`} variant="outline">{tf}</Badge>
                        ))}
                        {t.entryTimeframe ? <Badge>Entry: {t.entryTimeframe}</Badge> : null}
                        {(!t.viewTimeframes || t.viewTimeframes.length === 0) && !t.entryTimeframe && (
                          <div className="opacity-60 text-sm">–</div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Edit / Vervollständigen Dialog */}
      <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
        <DialogContent className="max-w-3xl p-0">
          <DialogHeader className="px-6 pt-6">
            <DialogTitle>{editing?.status === "draft" || !editing?.completed ? "Trade vervollständigen" : "Trade bearbeiten"}</DialogTitle>
          </DialogHeader>
          <div className="px-4 pb-4">
            {editing && (
              <TradeEntryForm
                date={editing.date}
                userId={userId}
                initialData={editing as any}
                onCreated={handleUpdated}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
