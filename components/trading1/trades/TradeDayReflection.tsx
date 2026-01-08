"use client";

import * as React from "react";
import useSWR from "swr";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

const fetcher = (u: string) => fetch(u).then((r) => r.json());

type Grade = "A" | "B" | "C";

type Trade = {
  _id: string;
  date?: string; // YYYY-MM-DD
  createdAt?: string; // ISO
  symbol?: string;
  result?: "win" | "loss" | "BE" | "ongoing";
  pnl?: number;

  // Trade-Game (aus TradeEntry)
  gameGrade?: Grade;

  // ICC (aus v2 interface.ts)
  isICC?: boolean;

  iccChecklistPriceAt4h?: boolean;
  iccChecklist1HFollowsTrend?: boolean;
  iccChecklistBosSwing?: boolean;
  iccChecklistTfCorrelation?: boolean;
  iccChecklistEntryImpulseZone?: boolean;
  iccChecklistSessionTime?: boolean;
  iccChecklistTargetOppositeSide?: boolean;

  strategy?: string;
  strategy_name?: string;
};

type LibraryItem = {
  _id: string;
  label: string;
  game: Grade;
  points?: number;
  active?: boolean;
  archived?: boolean;
  tags?: string[];
  scope?: "trade" | "setup" | "reflection";
};

type DayReflectionDoc = {
  _id?: string;
  type: "day_reflection";
  userId: string;
  date: string; // YYYY-MM-DD

  // Persistierter Final-Tagesscore
  dayAvgScore?: number;
  dayGrade?: Grade;

  notes?: string;
  noTradeButGood?: boolean;

  missedSetups?: {
    count?: number;
    reasons?: string[];
    notes?: string;
  };

  // quick extras (+A/+B/+C)
  manualExtras?: Grade[];

  // Reflection Game
  reflectionSelectedIds?: string[];
  reflectionAvgScore?: number;
  reflectionGrade?: Grade;

  // ✅ NEW: Setup Game
  setupSelectedIds?: string[];
  setupAvgScore?: number;
  setupGrade?: Grade;

  // backwards compatibility (falls alte Docs existieren)
  reflectionGame?: {
    selectedIds?: string[];
    avgScore?: number;
    grade?: Grade;
  };

  createdAt?: string;
  updatedAt?: string;
};

const pointsForGrade = (g: Grade) => (g === "A" ? 3 : g === "B" ? 2 : 1);
const gradeFromAvg = (avg: number): Grade => {
  if (avg >= 2.5) return "A";
  if (avg >= 1.5) return "B";
  return "C";
};

function todayISO() {
  const d = new Date();
  const z = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;
}
function toDateOnly(s?: string) {
  if (!s) return "";
  return s.length > 10 ? s.slice(0, 10) : s;
}
function fmtBerlin(ts?: string) {
  if (!ts) return { date: "—", time: "—" };
  const dt = new Date(ts);
  const date = dt.toLocaleDateString("de-DE", { timeZone: "Europe/Berlin" });
  const time = dt.toLocaleTimeString("de-DE", {
    timeZone: "Europe/Berlin",
    hour: "2-digit",
    minute: "2-digit",
  });
  return { date, time };
}
function badgeVariant(g: Grade) {
  return g === "A" ? "default" : g === "B" ? "secondary" : "outline";
}

export default function TradeDayReflection({
  userId,
  date: dateProp,
}: {
  userId: string;
  date?: string;
}) {
  const [date, setDate] = React.useState<string>(toDateOnly(dateProp) || todayISO());

  // URL-Param ?date=YYYY-MM-DD übernehmen
  React.useEffect(() => {
    try {
      const u = new URL(window.location.href);
      const d = u.searchParams.get("date");
      if (d) setDate(toDateOnly(d));
    } catch {}
  }, []);

  // Trades laden (API liefert alles → wir filtern auf den Tag)
  const tradesKey = React.useMemo(() => {
    if (!userId) return null;
    const p = new URLSearchParams({ userId });
    return `/api/trading/trades/list?${p.toString()}`;
  }, [userId]);

  // Day-Reflection Doc
  const reflKey = React.useMemo(() => {
    if (!userId || !date) return null;
    const p = new URLSearchParams({ userId, date });
    return `/api/trading/day/reflection?${p.toString()}`;
  }, [userId, date]);

  // Reflection Game Items
  const reflectionGameKey = React.useMemo(() => {
    if (!userId) return null;
    const p = new URLSearchParams({
      userId,
      scope: "reflection",
      active: "true",
      limit: "500",
    });
    return `/api/trading/gameLibrary?${p.toString()}`;
  }, [userId]);

  // ✅ NEW: Setup Game Items
  const setupGameKey = React.useMemo(() => {
    if (!userId) return null;
    const p = new URLSearchParams({
      userId,
      scope: "setup",
      active: "true",
      limit: "500",
    });
    return `/api/trading/gameLibrary?${p.toString()}`;
  }, [userId]);

  const { data: tradesRes } = useSWR<{ trades: Trade[] }>(tradesKey, fetcher);
  const { data: reflRes, mutate: mutateRefl } = useSWR<{ reflection?: DayReflectionDoc | null }>(
    reflKey,
    fetcher
  );
  const { data: refGameRes } = useSWR<{ items: LibraryItem[] }>(reflectionGameKey, fetcher);
  const { data: setupGameRes } = useSWR<{ items: LibraryItem[] }>(setupGameKey, fetcher);

  const tradesAll = tradesRes?.trades ?? [];
  const trades = React.useMemo(() => {
    return tradesAll.filter((t) => toDateOnly(t.date) === date);
  }, [tradesAll, date]);

  const rInit = reflRes?.reflection ?? undefined;

  const reflectionItems = React.useMemo(() => {
    return (refGameRes?.items ?? [])
      .filter((i) => i.archived !== true)
      .filter((i) => i.active !== false);
  }, [refGameRes]);

  // ✅ NEW: Setup Items
  const setupItems = React.useMemo(() => {
    return (setupGameRes?.items ?? [])
      .filter((i) => i.archived !== true)
      .filter((i) => i.active !== false);
  }, [setupGameRes]);

  // lokaler Form-State
  const [notes, setNotes] = React.useState("");
  const [noTradeButGood, setNoTradeButGood] = React.useState(false);
  const [missedCount, setMissedCount] = React.useState<string>("");
  const [missedReasons, setMissedReasons] = React.useState<string[]>([]);
  const [missedNotes, setMissedNotes] = React.useState("");

  // Quick-Extras (optional)
  const [extras, setExtras] = React.useState<Grade[]>([]);

  // Reflection-Game Selection
  const [selectedRefIds, setSelectedRefIds] = React.useState<Set<string>>(new Set());
  const [refQ, setRefQ] = React.useState<string>("");

  // ✅ NEW: Setup-Game Selection
  const [selectedSetupIds, setSelectedSetupIds] = React.useState<Set<string>>(new Set());
  const [setupQ, setSetupQ] = React.useState<string>("");

  // Init aus DB
  React.useEffect(() => {
    if (!rInit) {
      setNotes("");
      setNoTradeButGood(false);
      setMissedCount("");
      setMissedReasons([]);
      setMissedNotes("");
      setExtras([]);
      setSelectedRefIds(new Set());
      setSelectedSetupIds(new Set());
      return;
    }

    setNotes(rInit.notes ?? "");
    setNoTradeButGood(!!rInit.noTradeButGood);

    setMissedCount(rInit.missedSetups?.count != null ? String(rInit.missedSetups.count) : "");
    setMissedReasons(Array.isArray(rInit.missedSetups?.reasons) ? (rInit.missedSetups!.reasons as string[]) : []);
    setMissedNotes(rInit.missedSetups?.notes ?? "");

    setExtras(
      Array.isArray(rInit.manualExtras)
        ? (rInit.manualExtras.filter((x): x is Grade => x === "A" || x === "B" || x === "C") as Grade[])
        : []
    );

    // ✅ support: new flat fields OR old nested reflectionGame
    const ids =
      (Array.isArray(rInit.reflectionSelectedIds) ? rInit.reflectionSelectedIds : undefined) ??
      (Array.isArray(rInit.reflectionGame?.selectedIds) ? rInit.reflectionGame!.selectedIds! : []);

    setSelectedRefIds(new Set(ids.map(String).filter(Boolean)));

    // ✅ NEW: setup ids
    const setupIds = Array.isArray(rInit.setupSelectedIds) ? rInit.setupSelectedIds : [];
    setSelectedSetupIds(new Set(setupIds.map(String).filter(Boolean)));
  }, [rInit?._id, rInit?.updatedAt]);

  // helpers
  function toggleReason(r: string) {
    setMissedReasons((prev) => (prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]));
  }
  const addExtra = (g: Grade) => setExtras((prev) => [...prev, g]);
  const removeExtra = (idx: number) => setExtras((prev) => prev.filter((_, i) => i !== idx));

  const toggleRef = (id: string, on?: boolean) => {
    setSelectedRefIds((prev) => {
      const next = new Set(prev);
      const shouldAdd = on ?? !prev.has(id);
      if (shouldAdd) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  // ✅ NEW: toggle setup
  const toggleSetup = (id: string, on?: boolean) => {
    setSelectedSetupIds((prev) => {
      const next = new Set(prev);
      const shouldAdd = on ?? !prev.has(id);
      if (shouldAdd) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  // Trade-Game: Ø aus Trades (A/B/C)
  const tradeSummary = React.useMemo(() => {
    let sum = 0;
    let n = 0;
    for (const t of trades) {
      const g = t.gameGrade;
      if (g === "A" || g === "B" || g === "C") {
        sum += pointsForGrade(g);
        n += 1;
      }
    }
    const avg = n ? +(sum / n).toFixed(2) : 0;
    return { count: n, sum, avg, grade: gradeFromAvg(avg) as Grade };
  }, [trades]);

  // Reflection-Game: Ø aus ausgewählten Items (ohne Extras!)
  const reflectionSummary = React.useMemo(() => {
    const pointsById = new Map<string, number>();
    for (const it of reflectionItems) {
      const p = Number(it.points ?? pointsForGrade(it.game));
      pointsById.set(it._id, Number.isFinite(p) ? p : pointsForGrade(it.game));
    }

    let sum = 0;
    let n = 0;
    for (const id of selectedRefIds) {
      const p = pointsById.get(id);
      if (Number.isFinite(p)) {
        sum += p as number;
        n += 1;
      }
    }

    const avg = n ? +(sum / n).toFixed(2) : 0;
    const grade = gradeFromAvg(avg);

    return {
      selectedCount: n,
      sum,
      avg,
      grade,
    };
  }, [reflectionItems, selectedRefIds]);

  // ✅ NEW: Setup-Game: Ø aus ausgewählten Items
  const setupSummary = React.useMemo(() => {
    const pointsById = new Map<string, number>();
    for (const it of setupItems) {
      const p = Number(it.points ?? pointsForGrade(it.game));
      pointsById.set(it._id, Number.isFinite(p) ? p : pointsForGrade(it.game));
    }

    let sum = 0;
    let n = 0;
    for (const id of selectedSetupIds) {
      const p = pointsById.get(id);
      if (Number.isFinite(p)) {
        sum += p as number;
        n += 1;
      }
    }

    const avg = n ? +(sum / n).toFixed(2) : 0;
    const grade = gradeFromAvg(avg);

    return {
      selectedCount: n,
      sum,
      avg,
      grade,
    };
  }, [setupItems, selectedSetupIds]);

  // Extras: Ø (separat)
  const extrasSummary = React.useMemo(() => {
    const n = extras.length;
    if (!n) return { count: 0, sum: 0, avg: 0 };
    const sum = extras.reduce((acc, g) => acc + pointsForGrade(g), 0);
    return { count: n, sum, avg: +(sum / n).toFixed(2) };
  }, [extras]);

  // Final Daily: Trades + Setup + Reflection + Extras (gleich gewichtet pro Eintrag)
  const finalSummary = React.useMemo(() => {
    const totalSum =
      tradeSummary.sum +
      setupSummary.sum +
      reflectionSummary.sum +
      extrasSummary.sum;

    const totalCount =
      tradeSummary.count +
      setupSummary.selectedCount +
      reflectionSummary.selectedCount +
      extrasSummary.count;

    if (totalCount === 0) {
      const avg = noTradeButGood ? 2.0 : 0;
      return {
        avg: +avg.toFixed(2),
        grade: gradeFromAvg(avg) as Grade,
        rationale: noTradeButGood ? "Kein Trade & gut so → B (2.00)" : "Keine Daten",
      };
    }

    const avg = totalSum / totalCount;
    return {
      avg: +avg.toFixed(2),
      grade: gradeFromAvg(avg) as Grade,
      rationale: `Trades (${tradeSummary.count}) + Setup (${setupSummary.selectedCount}) + Reflection (${reflectionSummary.selectedCount}) + Extras (${extrasSummary.count})`,
    };
  }, [tradeSummary, setupSummary, reflectionSummary, extrasSummary, noTradeButGood]);

  // ICC Summary (aus iccChecklist* Feldern)
  const iccSummary = React.useMemo(() => {
    const iccTrades = trades.filter((t) => t.isICC);
    const total = iccTrades.length;
    if (!total) return { total: 0, avgChecklist: 0 };

    const fields: (keyof Trade)[] = [
      "iccChecklistPriceAt4h",
      "iccChecklist1HFollowsTrend",
      "iccChecklistBosSwing",
      "iccChecklistTfCorrelation",
      "iccChecklistEntryImpulseZone",
      "iccChecklistSessionTime",
      "iccChecklistTargetOppositeSide",
    ];

    let sumChecklist = 0;
    for (const t of iccTrades) {
      let hits = 0;
      for (const f of fields) if (t[f] === true) hits += 1;
      sumChecklist += hits / fields.length;
    }

    return {
      total,
      avgChecklist: +(sumChecklist / total).toFixed(2),
    };
  }, [trades]);

  const savedAvg = rInit?.dayAvgScore;
  const savedGrade = rInit?.dayGrade;

  const missedReasonOptions = ["Angst", "Gier", "Ablenkung", "Zu spät", "Unsicherheit", "Overanalysis", "Technik"];

  const visibleReflectionItems = React.useMemo(() => {
    const q = refQ.trim().toLowerCase();
    if (!q) return reflectionItems;
    return reflectionItems.filter((it) => {
      const t = `${it.label} ${(it.tags ?? []).join(" ")}`.toLowerCase();
      return t.includes(q);
    });
  }, [refQ, reflectionItems]);

  const itemsByGame: Record<Grade, LibraryItem[]> = React.useMemo(
    () => ({
      A: visibleReflectionItems.filter((i) => i.game === "A"),
      B: visibleReflectionItems.filter((i) => i.game === "B"),
      C: visibleReflectionItems.filter((i) => i.game === "C"),
    }),
    [visibleReflectionItems]
  );

  // ✅ NEW: visible setup items + grouping
  const visibleSetupItems = React.useMemo(() => {
    const q = setupQ.trim().toLowerCase();
    if (!q) return setupItems;
    return setupItems.filter((it) => {
      const t = `${it.label} ${(it.tags ?? []).join(" ")}`.toLowerCase();
      return t.includes(q);
    });
  }, [setupQ, setupItems]);

  const setupItemsByGame: Record<Grade, LibraryItem[]> = React.useMemo(
    () => ({
      A: visibleSetupItems.filter((i) => i.game === "A"),
      B: visibleSetupItems.filter((i) => i.game === "B"),
      C: visibleSetupItems.filter((i) => i.game === "C"),
    }),
    [visibleSetupItems]
  );

  async function saveReflection() {
    const payload: any = {
      type: "day_reflection",
      userId,
      date,

      // FINAL daily rating
      dayAvgScore: finalSummary.avg,
      dayGrade: finalSummary.grade,

      notes: notes?.trim() || undefined,
      noTradeButGood,

      missedSetups: {
        count: Number.isFinite(Number(missedCount)) ? Number(missedCount) : undefined,
        reasons: missedReasons.length ? missedReasons : undefined,
        notes: missedNotes?.trim() || undefined,
      },

      // Quick-Extras (persistiert ab Step 2)
      manualExtras: extras.length ? extras : undefined,

      // ✅ Reflection Game (flat)
      reflectionSelectedIds: Array.from(selectedRefIds),
      reflectionAvgScore: reflectionSummary.avg,
      reflectionGrade: reflectionSummary.grade,

      // ✅ NEW: Setup Game (flat)
      setupSelectedIds: Array.from(selectedSetupIds),
      setupAvgScore: setupSummary.avg,
      setupGrade: setupSummary.grade,
    };

    const res = await fetch("/api/trading/day/reflection", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      alert("Speichern fehlgeschlagen: " + txt);
      return;
    }

    await mutateRefl();
  }

  return (
    <Card id="day-reflection">
      <CardHeader>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div>
            <CardTitle>Day Reflection</CardTitle>
            <CardDescription>
              Trades des Tages + Setup-Game + Reflexion + Reflection-Game Faktoren (A/B/C) → finaler Tages-Grade.
            </CardDescription>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-[150px]" />

            <Badge variant={badgeVariant(finalSummary.grade)}>
              Tages-Game (final): {finalSummary.grade} • {finalSummary.avg.toFixed(2)} Pkt
            </Badge>

            {savedGrade ? (
              <Badge variant="outline" title="Gespeichertes Daily-Rating">
                Gespeichert: {savedGrade} • {(savedAvg ?? 0).toFixed(2)} Pkt
              </Badge>
            ) : null}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Quick Summary */}
        <div className="rounded-lg border p-3 text-sm grid grid-cols-1 md:grid-cols-5 gap-3">
          <div>
            <div className="text-xs text-muted-foreground">Trade-Game</div>
            <div>
              n = {tradeSummary.count} • Ø {tradeSummary.avg.toFixed(2)} Pkt
            </div>
          </div>

          <div>
            <div className="text-xs text-muted-foreground">Setup-Game</div>
            <div>
              ausgewählt = {setupSummary.selectedCount} • Ø {setupSummary.avg.toFixed(2)} • {setupSummary.grade}
            </div>
          </div>

          <div>
            <div className="text-xs text-muted-foreground">Reflection-Game</div>
            <div>
              ausgewählt = {reflectionSummary.selectedCount} • Ø {reflectionSummary.avg.toFixed(2)} • {reflectionSummary.grade}
            </div>
          </div>

          <div>
            <div className="text-xs text-muted-foreground">ICC</div>
            <div>
              {iccSummary.total} Trades • Ø Checklist {iccSummary.avgChecklist.toFixed(2)}
            </div>
          </div>

          <div className="flex items-center md:justify-end">
            <Badge variant={badgeVariant(finalSummary.grade)} title={finalSummary.rationale}>
              Final: {finalSummary.grade} • {finalSummary.avg.toFixed(2)}
            </Badge>
          </div>
        </div>

        {/* Trades Liste */}
        <div className="rounded-md border">
          <div className="px-3 py-2 text-sm font-medium border-b flex items-center justify-between">
            <span>Trades am {date}</span>
            <Badge variant="outline">{trades.length} Trades</Badge>
          </div>

          {trades.length === 0 ? (
            <div className="px-3 py-6 text-sm text-muted-foreground">
              Keine Trades. Nutze Setup/Reflection Game unten oder hake Faktoren an.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b">
                    <th className="py-2 px-3">Zeit</th>
                    <th className="py-2 px-3">Symbol</th>
                    <th className="py-2 px-3">Result</th>
                    <th className="py-2 px-3">PnL</th>
                    <th className="py-2 px-3">Trade-Game</th>
                    <th className="py-2 px-3">ICC</th>
                  </tr>
                </thead>
                <tbody>
                  {trades.map((t) => {
                    const { date: dLocal, time } = fmtBerlin(t.createdAt);
                    return (
                      <tr key={t._id} className="border-b last:border-0">
                        <td className="py-2 px-3 font-mono">
                          {dLocal} {time}
                        </td>
                        <td className="py-2 px-3">{t.symbol || "—"}</td>
                        <td className="py-2 px-3">{t.result || "—"}</td>
                        <td className={`py-2 px-3 tabular-nums ${Number(t.pnl) >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                          {Number.isFinite(Number(t.pnl)) ? Number(t.pnl).toFixed(2) : "—"}
                        </td>
                        <td className="py-2 px-3">{t.gameGrade || "—"}</td>
                        <td className="py-2 px-3">{t.isICC ? <Badge variant="secondary">ICC</Badge> : "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Forms */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Notes & Extras */}
          <div className="space-y-3">
            <label className="text-sm font-medium">Tages-Notizen / Gedanken</label>
            <Textarea
              placeholder="Was ist dir heute aufgefallen? Wie war Ausführung/Fokus/Emotion? Was nimmst du dir für morgen vor?"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={8}
            />

            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={noTradeButGood} onCheckedChange={(v) => setNoTradeButGood(!!v)} />
              Kein Trade heute & das war richtig (kein A-Setup/kein Edge)
            </label>

            {/* Quick Extras */}
            <div className="mt-3 space-y-2">
              <div className="text-sm font-medium">Optionale Tages-Extras</div>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="secondary" size="sm" onClick={() => addExtra("A")}>
                  + A (3)
                </Button>
                <Button type="button" variant="secondary" size="sm" onClick={() => addExtra("B")}>
                  + B (2)
                </Button>
                <Button type="button" variant="secondary" size="sm" onClick={() => addExtra("C")}>
                  + C (1)
                </Button>
              </div>

              {extras.length > 0 && (
                <div className="rounded-md border p-2 text-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      {extras.map((g, i) => (
                        <Badge key={i} variant={badgeVariant(g)} className="mr-1">
                          {g}
                        </Badge>
                      ))}
                    </div>
                    <div className="text-xs text-muted-foreground">Extras: {extras.length}</div>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {extras.map((g, i) => (
                      <Button key={`x-${i}`} type="button" size="sm" variant="ghost" onClick={() => removeExtra(i)}>
                        Entfernen {g}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Setup Game + Reflection Game + Missed Setups */}
          <div className="space-y-4">
            {/* ✅ NEW: Setup Game */}
            <div className="rounded-lg border p-3 space-y-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div>
                  <div className="text-sm font-medium">Setup Game (A/B/C)</div>
                  <div className="text-xs text-muted-foreground">
                    Hake Faktoren an, wie gut dein Setup-Selection-Prozess war (z. B. “nur A-Setups”, “zu früh/zu spät”, “kein Edge”).
                  </div>
                </div>
                <Badge variant={badgeVariant(setupSummary.grade)}>
                  {setupSummary.grade} • Ø {setupSummary.avg.toFixed(2)}
                </Badge>
              </div>

              <Input value={setupQ} onChange={(e) => setSetupQ(e.target.value)} placeholder="Suchen (Label, Tags)…" />

              {setupItems.length === 0 ? (
                <div className="text-sm text-muted-foreground">
                  Noch keine Setup-Game-Faktoren vorhanden. Lege Items in der Game Library an (scope=setup).
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {(Object.keys(setupItemsByGame) as Grade[]).map((g) => (
                    <div key={g} className="rounded-md border p-2">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-sm font-medium">{g}-Faktoren</div>
                        <Badge variant={badgeVariant(g)}>{pointsForGrade(g)} P</Badge>
                      </div>

                      <div className="space-y-2 max-h-[220px] overflow-auto pr-1">
                        {setupItemsByGame[g].length === 0 ? (
                          <div className="text-xs text-muted-foreground">Keine Items</div>
                        ) : (
                          setupItemsByGame[g].map((it) => {
                            const checked = selectedSetupIds.has(it._id);
                            return (
                              <label key={it._id} className="flex items-start gap-2 text-sm">
                                <Checkbox checked={checked} onCheckedChange={(v) => toggleSetup(it._id, !!v)} />
                                <span className="leading-snug">{it.label}</span>
                              </label>
                            );
                          })
                        )}
                      </div>

                      <div className="mt-2 text-xs text-muted-foreground">
                        {setupItemsByGame[g].filter((it) => selectedSetupIds.has(it._id)).length} ausgewählt
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-between pt-2">
                <div className="text-xs text-muted-foreground">Ausgewählt: {Array.from(selectedSetupIds).length}</div>
                <Button type="button" variant="ghost" size="sm" onClick={() => setSelectedSetupIds(new Set())}>
                  Zurücksetzen
                </Button>
              </div>
            </div>

            {/* Reflection Game */}
            <div className="rounded-lg border p-3 space-y-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div>
                  <div className="text-sm font-medium">Reflection Game (A/B/C)</div>
                  <div className="text-xs text-muted-foreground">
                    Hake Faktoren an, die heute zutreffen (z. B. “alle ICC Faktoren aligned”, “gezögert”, “aus Angst kein Trade”).
                  </div>
                </div>
                <Badge variant={badgeVariant(reflectionSummary.grade)}>
                  {reflectionSummary.grade} • Ø {reflectionSummary.avg.toFixed(2)}
                </Badge>
              </div>

              <Input value={refQ} onChange={(e) => setRefQ(e.target.value)} placeholder="Suchen (Label, Tags)…" />

              {reflectionItems.length === 0 ? (
                <div className="text-sm text-muted-foreground">
                  Noch keine Reflection-Game-Faktoren vorhanden. Lege Items in der Game Library an (scope=reflection).
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {(Object.keys(itemsByGame) as Grade[]).map((g) => (
                    <div key={g} className="rounded-md border p-2">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-sm font-medium">{g}-Faktoren</div>
                        <Badge variant={badgeVariant(g)}>{pointsForGrade(g)} P</Badge>
                      </div>

                      <div className="space-y-2 max-h-[220px] overflow-auto pr-1">
                        {itemsByGame[g].length === 0 ? (
                          <div className="text-xs text-muted-foreground">Keine Items</div>
                        ) : (
                          itemsByGame[g].map((it) => {
                            const checked = selectedRefIds.has(it._id);
                            return (
                              <label key={it._id} className="flex items-start gap-2 text-sm">
                                <Checkbox checked={checked} onCheckedChange={(v) => toggleRef(it._id, !!v)} />
                                <span className="leading-snug">{it.label}</span>
                              </label>
                            );
                          })
                        )}
                      </div>

                      <div className="mt-2 text-xs text-muted-foreground">
                        {itemsByGame[g].filter((it) => selectedRefIds.has(it._id)).length} ausgewählt
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-between pt-2">
                <div className="text-xs text-muted-foreground">Ausgewählt: {Array.from(selectedRefIds).length}</div>
                <Button type="button" variant="ghost" size="sm" onClick={() => setSelectedRefIds(new Set())}>
                  Zurücksetzen
                </Button>
              </div>
            </div>

            {/* Missed Setups */}
            <div className="rounded-lg border p-3 space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium">Verpasste Setups</div>
                <div className="text-xs text-muted-foreground">Optional</div>
              </div>

              <div className="grid grid-cols-2 gap-3 items-end">
                <div>
                  <div className="text-xs mb-1">Anzahl</div>
                  <Input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    value={missedCount}
                    onChange={(e) => setMissedCount(e.target.value)}
                    placeholder="0"
                  />
                </div>

                <div>
                  <div className="text-xs mb-1">Häufigster Grund</div>
                  <Select
                    value={missedReasons[0] || ""}
                    onValueChange={(v) => {
                      if (!v) return;
                      setMissedReasons((prev) => (prev.includes(v) ? prev : [v, ...prev]));
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Grund wählen" />
                    </SelectTrigger>
                    <SelectContent>
                      {missedReasonOptions.map((r) => (
                        <SelectItem key={r} value={r}>
                          {r}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {missedReasonOptions.map((r) => {
                  const active = missedReasons.includes(r);
                  return (
                    <button
                      key={r}
                      type="button"
                      onClick={() => toggleReason(r)}
                      className={[
                        "px-2 py-1 text-xs rounded-md border",
                        active ? "bg-primary text-primary-foreground" : "bg-secondary",
                      ].join(" ")}
                    >
                      {r}
                    </button>
                  );
                })}
              </div>

              <div>
                <div className="text-xs mb-1">Bemerkungen zu verpassten Setups</div>
                <Textarea
                  placeholder="z. B. Angst vor Reversal → If/Then für morgen …"
                  value={missedNotes}
                  onChange={(e) => setMissedNotes(e.target.value)}
                  rows={4}
                />
              </div>
            </div>
          </div>
        </div>
      </CardContent>

      <CardFooter className="flex items-center justify-end gap-2">
        <Button onClick={saveReflection}>Reflection speichern</Button>
      </CardFooter>
    </Card>
  );
}
