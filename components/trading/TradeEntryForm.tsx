"use client";

import React, { useMemo, useEffect } from "react";
import { FormProvider, useForm, useFieldArray } from "react-hook-form";
import useSWR from "swr";
import { Textarea } from "@/components/ui/textarea";
import {
  Card, CardHeader, CardTitle, CardContent, CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  FormField, FormItem, FormLabel, FormControl, FormMessage,
} from "@/components/ui/form";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";

import TEFGeneral from "./trade-entry/TEFGeneral";
import TEFStrategy from "./trade-entry/TEFStrategy";
import ProcessKPIBadge from "./trade-entry/ProcessKPIBadge";
import ProcessFocusPanel from "./trade-entry/ProcessFocusPanel";
import { Account, TradeEntry } from "@/utils/interfaces/trading";

/* ————— Fetcher (mit Fehlerbehandlung) ————— */
const fetcher = async (url: string) => {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
};

/* --- Konstanten --- */
const SESSIONS = ["Asia", "London", "NewYork", "Overlap"] as const;
type SessionKey = (typeof SESSIONS)[number];
type BiasExec = "RR" | "RW" | "WR" | "WW";

/* Fallback-Library für mentale Fehler */
const DEFAULT_EMOTION_LIBRARY: { name: string; items: string[] }[] = [
  { name: "Angst", items: ["Exit zu früh", "zu früher entry", "Nicht geklickt", "nicht auf bos/cisd gewartet"] },
  { name: "Gier", items: ["Overtrading", "zu später entry", "zu viele Adds"] },
  { name: "Wut", items: ["Revenge", "Plan ignoriert", "SL verschoben"] },
  { name: "Overconfidence", items: ["Size zu groß", "Kein SL gesetzt"] },
  { name: "Undiszipliniert", items: ["Regelbruch", "Ablenkung", "Impulsiv"] },
];

/* ——— Game-Score Heuristik ——— */
function computeGameScore(opts: {
  biasExecution?: BiasExec;
  followedSetup?: boolean;
  respectedStopLoss?: boolean;
  managedRisk?: boolean;
  conceptsCount?: number;
  session?: SessionKey;
  result?: "win" | "loss" | "BE" | "ongoing";
  breakEven?: boolean;
  stopHit?: boolean;
  mistakes?: string[];
}) {
  let score = 0;
  if (opts.biasExecution === "RR") score += 8 + 6;
  if (opts.biasExecution === "RW") score += 8;
  if (opts.biasExecution === "WR") score += 6;
  if (opts.followedSetup) score += 5;
  if (opts.respectedStopLoss) score += 5;
  if (opts.managedRisk) score += 5;
  const conf = Math.min(5, Math.max(0, opts.conceptsCount ?? 0));
  score += conf * 1;
  if (opts.session) score += 2;
  if (opts.result === "win") score += 2;
  if (opts.stopHit || opts.result === "loss") score -= 2;

  const mistakes = opts.mistakes ?? [];
  const criticalSet = new Set(["SL verschoben", "Revenge", "Plan ignoriert", "Size zu groß"]);
  let criticalCount = mistakes.filter((m) => criticalSet.has(m)).length;
  criticalCount = Math.min(2, criticalCount);
  score -= criticalCount * 5;

  const grade = score >= 20 ? "A" : score >= 12 ? "B" : "C";
  return { score, grade: grade as "A" | "B" | "C" };
}

/** Dauer in Minuten aus HH:mm */
function minutesBetween(start?: string, end?: string) {
  if (!start || !end) return 0;
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  if ([sh, sm, eh, em].some((n) => Number.isNaN(n))) return 0;
  return Math.max(0, (eh * 60 + em) - (sh * 60 + sm));
}

/** Pflichtfelder prüfen – Draft, wenn etwas fehlt (Entry ODER Exit reicht) */
function computeMissingFields(values: any) {
  const missing: string[] = [];
  const hasEntryOrExit =
    Number.isFinite(Number(values.entry)) || Number.isFinite(Number(values.exit));

  if (!values.accountId) missing.push("accountId");
  if (!values.symbol) missing.push("symbol");
  if (!values.tradeType) missing.push("tradeType");
  if (!hasEntryOrExit) missing.push("entry/exit");

  // result nur nötig, wenn nicht "ongoing" (lokaler Sentinel)
  if (!values.result || values.result === "ongoing") {
    missing.push("result");
  }
  return missing;
}

type ConceptForm = {
  name: string;
  direction?: "bullish" | "bearish" | "neutral";
  timeframe: string;
  note?: string;
};

type PartialExitForm = {
  label?: string;
  price?: number;
  percent?: number; // 0..100
  at?: string;
  note?: string;
};

/* ——— Formular-Werte ——— */
type FormValues = Omit<TradeEntry, "processFocus" | "ifThenPlan" | "processIntent"> & {
  result?: TradeEntry["result"] | "ongoing";
  startTime?: string;
  endTime?: string;
  durationMin?: number;
  session?: SessionKey;
  outcomeFlags?: { breakEven?: boolean; stopHit?: boolean };
  biasExecution?: BiasExec;
  tradingMistakes?: string[];
  emotionBefore?: string;
  viewTimeframes?: string[];
  entryTimeframe?: string;
  concepts?: ConceptForm[];
  location?: string;
  gameComputed?: "A" | "B" | "C";
  gameSelf?: "A" | "B" | "C";
  gameItems?: string[];               // speichert Keys wie "A:Label"
  gameCatalogScore?: number;          // Ø-Punkte (0..3)
  gameCatalogGrade?: "A" | "B" | "C";
  customMistake?: string;
  strategyAdherence?: "yes" | "partial" | "no";
  hasPartialExits?: boolean;
  partialExits?: PartialExitForm[];
  processIntent?: string;
  processFocus?: string[];
  ifThenPlan?: string;
  processAdherence?: number;
  tiltNoticed?: boolean;
  cooldownDone?: boolean;
  processDebrief?: string;
  hidePnLUntilDebrief?: boolean;
  luckFactor?: "positive" | "neutral" | "negative";
  processNotes?: string;
};

type GameItem = {
  _id: string;
  userId: string;
  label: string;
  game: "A" | "B" | "C";
  points?: number;
  active?: boolean;
};

interface Props {
  date: string;
  userId: string;
  initialData?: TradeEntry;
  onCreated?: () => void;
  onUpdated?: () => void;
  mode?: "create" | "edit";
}

/* 🔸 S-Game Regel: mind. 3 A-Items, und KEIN B/C ausgewählt */
function isSGame(selectedKeys?: string[]): boolean {
  const arr = Array.isArray(selectedKeys) ? selectedKeys : [];
  let a = 0, hasBC = false;
  for (const k of arr) {
    if (k.startsWith("A:")) a++;
    else if (k.startsWith("B:") || k.startsWith("C:")) { hasBC = true; break; }
  }
  return a >= 3 && !hasBC;
}

/* kleines Hilfs-Mapping für Badge-Varianten */
function gradeBadgeVariant(g: "S" | "A" | "B" | "C" | undefined) {
  if (g === "S" || g === "A") return "default" as const;
  if (g === "B") return "secondary" as const;
  return "outline" as const;
}

export default function TradeEntryForm({
  date, userId, initialData, onCreated, onUpdated,
}: Props) {
  // --- Form Setup
  const methods = useForm<FormValues>({
    defaultValues: {
      ...initialData,
      date,
      symbol: initialData?.symbol || "",
      accountId: initialData?.accountId || "",
      entry: initialData?.entry ?? 0,
      exit: initialData?.exit ?? 0,
      pnl: initialData?.pnl ?? 0,
      result: (initialData?.result as any) || "win",
      strategy_name: initialData?.strategy_name || "",
      strategy: (initialData as any)?.strategy || initialData?.strategy_name || "",
      tradeType: initialData?.tradeType || "buy",
      lotSize: (initialData as any)?.lotSize ?? undefined,
      potentialLoss: (initialData as any)?.potentialLoss ?? undefined,
      riskReward: (initialData as any)?.riskReward || "",
      notes: (initialData as any)?.notes || "",
      emotionBefore: (initialData as any)?.emotionBefore || "Neutral",
      followedSetup: (initialData as any)?.followedSetup || false,
      respectedStopLoss: (initialData as any)?.respectedStopLoss || false,
      managedRisk: (initialData as any)?.managedRisk || false,
      disciplineScore: (initialData as any)?.disciplineScore || 0,
      startTime: (initialData as any)?.startTime || "",
      endTime: (initialData as any)?.endTime || "",
      durationMin: (initialData as any)?.durationMin || 0,
      session: (initialData as any)?.session || undefined,
      outcomeFlags: (initialData as any)?.outcomeFlags || { breakEven: false, stopHit: false },
      biasExecution: (initialData as any)?.biasExecution || undefined,
      tradingMistakes: (initialData as any)?.tradingMistakes || [],
      viewTimeframes: (initialData as any)?.viewTimeframes || [],
      entryTimeframe: (initialData as any)?.entryTimeframe || "",
      concepts: (initialData as any)?.concepts || [],
      location: (initialData as any)?.location || "",
      gameItems: (initialData as any)?.gameItems || [],
      gameCatalogScore: (initialData as any)?.gameCatalogScore ?? 0,
      gameCatalogGrade: (initialData as any)?.gameCatalogGrade || "B",
      gameSelf: (initialData as any)?.gameSelf || undefined,
      gameComputed: (initialData as any)?.gameComputed || undefined,
      customMistake: "",
      strategyAdherence: (initialData as any)?.strategyAdherence || undefined,
      hasPartialExits: (initialData as any)?.hasPartialExits || false,
      processIntent: (initialData as any)?.processIntent || "",
      processFocus: (initialData as any)?.processFocus || [],
      ifThenPlan: (initialData as any)?.ifThenPlan || "",
      processAdherence: (initialData as any)?.processAdherence ?? 0,
      tiltNoticed: (initialData as any)?.tiltNoticed ?? false,
      cooldownDone: (initialData as any)?.cooldownDone ?? false,
      processDebrief: (initialData as any)?.processDebrief || "",
      hidePnLUntilDebrief: (initialData as any)?.hidePnLUntilDebrief ?? true,
      luckFactor: (initialData as any)?.luckFactor ?? "neutral",
      processNotes: (initialData as any)?.processNotes ?? "",
      partialExits: Array.isArray((initialData as any)?.partialExits)
        ? ((initialData as any)?.partialExits as any[]).map((p, idx: number) => ({
            label: p?.label ?? `TP ${idx + 1}`,
            price: Number.isFinite(Number(p?.price)) ? Number(p?.price) : undefined,
            percent: Number.isFinite(Number(p?.percent)) ? Number(p?.percent) : undefined,
            at: p?.at ?? "",
            note: p?.note ?? "",
          }))
        : [],
    } as Partial<FormValues>,
  });

  const { control, handleSubmit, watch, setValue } = methods;
  const v = watch();

  // FieldArray für partialExits
  const { fields, append, remove } = useFieldArray({
    control,
    name: "partialExits" as const,
  });

  const [pending, setPending] = React.useState(false);

  // Accounts optional laden
  useSWR<{ accounts: Account[] }>(
    userId ? `/api/trading/getAllAccounts?userId=${userId}` : null,
    fetcher
  );

  // Emotions-Bibliothek
  const { data: emoData } = useSWR<{ categories: { name: string; items: string[] }[] }>(
    userId ? `/api/trading/emotion-library?userId=${userId}` : null,
    fetcher
  );
  const emotionLibrary = emoData?.categories?.length ? emoData.categories : DEFAULT_EMOTION_LIBRARY;
  const allMistakeChoices = useMemo(
    () => Array.from(new Set(emotionLibrary.flatMap((c) => c.items.map(String)))),
    [emotionLibrary]
  );

  /* -------- A/B/C Game Library laden -------- */
  type GameLibItem = { _id: string; userId: string; label: string; game: "A" | "B" | "C"; points?: number; active?: boolean };
  const { data: gameLibRes, error: gameLibErr } = useSWR<{
    items: GameLibItem[];
    nextCursor?: string | null;
    summary?: any;
  }>(
    userId ? `/api/trading/gameLibrary?userId=${userId}&active=true&limit=500` : null,
    fetcher
  );

  useEffect(() => {
    if (userId) {
      console.log("[TEF] gameLibrary response:", { count: gameLibRes?.items?.length ?? 0, items: gameLibRes?.items });
      if (gameLibErr) console.warn("[TEF] gameLibrary error:", gameLibErr);
    }
  }, [userId, gameLibRes, gameLibErr]);

  const gameItems = gameLibRes?.items ?? [];
  const itemsByGrade = useMemo(() => ({
    A: gameItems.filter((i) => i.game === "A"),
    B: gameItems.filter((i) => i.game === "B"),
    C: gameItems.filter((i) => i.game === "C"),
  }), [gameItems]);

  const pointsMap = useMemo(() => {
    const m = new Map<string, number>();
    for (const it of gameItems) {
      const key = `${it.game}:${it.label}`;
      const p = it.points ?? (it.game === "A" ? 3 : it.game === "B" ? 2 : 1);
      m.set(key, p);
    }
    return m;
  }, [gameItems]);

  // Disziplin automatisch berechnen
  useEffect(() => {
    const flags = [!!v.followedSetup, !!v.respectedStopLoss, !!v.managedRisk];
    const percent = Math.round((flags.filter(Boolean).length / 3) * 100);
    if (v.disciplineScore !== percent) {
      setValue("disciplineScore", percent, { shouldDirty: true });
    }
  }, [v.followedSetup, v.respectedStopLoss, v.managedRisk, v.disciplineScore, setValue]);

  // Live-Game (Bias/Exec/Mistakes -> Heuristik)
  const gameComputedLive = useMemo(() => {
    const r = computeGameScore({
      biasExecution: v.biasExecution as BiasExec | undefined,
      followedSetup: v.followedSetup,
      respectedStopLoss: v.respectedStopLoss,
      managedRisk: v.managedRisk,
      conceptsCount: v.concepts?.length ?? 0,
      session: v.session as SessionKey | undefined,
      result: v.result as any,
      breakEven: v.outcomeFlags?.breakEven,
      stopHit: v.outcomeFlags?.stopHit,
      mistakes: v.tradingMistakes,
    });
    return r;
  }, [
    v.biasExecution,
    v.followedSetup,
    v.respectedStopLoss,
    v.managedRisk,
    v.concepts,
    v.session,
    v.result,
    v.outcomeFlags?.breakEven,
    v.outcomeFlags?.stopHit,
    v.tradingMistakes,
  ]);

  // Mentale Fehler toggeln
  const toggleMistake = (label: string) => {
    const cur = Array.isArray(v.tradingMistakes) ? [...v.tradingMistakes] : [];
    const idx = cur.findIndex((x) => x === label);
    if (idx >= 0) cur.splice(idx, 1);
    else cur.push(label);
    setValue("tradingMistakes", cur, { shouldDirty: true });
  };

  // Game Items toggeln
  const toggleGameItem = (grade: "A" | "B" | "C", label: string) => {
    const cur = new Set<string>(Array.isArray(v.gameItems) ? v.gameItems : []);
    const key = `${grade}:${label}`;
    if (cur.has(key)) cur.delete(key);
    else cur.add(key);
    setValue("gameItems", Array.from(cur), { shouldDirty: true });
  };

  // Score/Grade aus selektierten GameItems berechnen (Ø Punkte)
  useEffect(() => {
    const selected = Array.isArray(v.gameItems) ? v.gameItems : [];
    const n = selected.length;
    let sum = 0;
    for (const k of selected) sum += pointsMap.get(k) ?? 0;
    const avg = n > 0 ? sum / n : 0;
    const grade: "A" | "B" | "C" = avg >= 2.5 ? "A" : avg >= 1.5 ? "B" : "C";

    if ((v.gameCatalogScore ?? 0) !== Number(avg.toFixed(2))) {
      setValue("gameCatalogScore", Number(avg.toFixed(2)), { shouldDirty: true });
    }
    if (v.gameCatalogGrade !== grade) {
      setValue("gameCatalogGrade", grade, { shouldDirty: true });
    }
  }, [v.gameItems, pointsMap, setValue, v.gameCatalogScore, v.gameCatalogGrade]);

  // 🔸 Live S-Badge (Display only)
  const isS = useMemo(() => isSGame(v.gameItems), [v.gameItems]);
  const liveDisplayGrade: "S" | "A" | "B" | "C" =
    isS
      ? "S"
      : ((v.gameCatalogGrade as "A" | "B" | "C" | undefined) ?? v.gameSelf ?? gameComputedLive.grade);

  // Prozent-Summe Partial Exits
  const percentSum = useMemo(() => {
    const arr = Array.isArray(v.partialExits) ? v.partialExits : [];
    return arr.reduce((acc: any, it: PartialExitForm) => {
      const n = Number(it?.percent);
      return acc + (Number.isFinite(n) ? n : 0);
    }, 0);
  }, [v.partialExits]);

  // SUBMIT (final/draft)
  const onSubmit = async (values: FormValues, forceStatus?: "final" | "draft") => {
    setPending(true);
    try {
      let vals: any = { ...values };
      const missing = computeMissingFields(vals);

      // "ongoing" ⇒ Draft + kein result übertragen
      let forceDraftByOngoing = false;
      if (vals.result === "ongoing") {
        forceDraftByOngoing = true;
        delete vals.result;
      }

      // Partial-Exits: Validierung Summe ≤ 100
      if (vals.hasPartialExits) {
        const sum = (Array.isArray(vals.partialExits) ? vals.partialExits : []).reduce(
          (acc: number, it: any) => {
            const n = Number(it?.percent);
            return acc + (Number.isFinite(n) ? n : 0);
          },
          0
        );
        if (sum > 100 + 1e-9) {
          alert("Die Summe der Teil-Exit-Prozente darf 100% nicht überschreiten.");
          setPending(false);
          return;
        }
      }

      // ⚠️ Backend akzeptiert nur A|B|C → S bleibt Anzeige-Only!
      const preferredGrade: "A" | "B" | "C" =
        (vals.gameCatalogGrade as "A" | "B" | "C" | undefined) ??
        (vals.gameSelf as "A" | "B" | "C" | undefined) ??
        computeGameScore({
          biasExecution: vals.biasExecution,
          followedSetup: vals.followedSetup,
          respectedStopLoss: vals.respectedStopLoss,
          managedRisk: vals.managedRisk,
          conceptsCount: vals.concepts?.length ?? 0,
          session: vals.session as any,
          result: vals.result as any,
          breakEven: vals.outcomeFlags?.breakEven,
          stopHit: vals.outcomeFlags?.stopHit,
          mistakes: vals.tradingMistakes,
        }).grade;

      const num = (x: any, d = 0) => {
        const n = Number(x);
        return Number.isFinite(n) ? n : d;
      };
      const numOpt = (x: any) => {
        const n = Number(x);
        return Number.isFinite(n) ? n : undefined;
      };
      const strTrim = (x: any) => {
        const s = typeof x === "string" ? x.trim() : "";
        return s.length ? s : undefined;
      };

      const desiredStatus: "final" | "draft" =
        forceStatus ?? (missing.length > 0 ? "draft" : "final");
      const finalStatus: "final" | "draft" =
        forceDraftByOngoing ? "draft" : desiredStatus;

      // Partial-Exits sanitisieren
      const partialExitsSan = Array.isArray(vals.partialExits)
        ? vals.partialExits
            .map((p: PartialExitForm, idx: number) => {
              const label = strTrim(p?.label) ?? `TP ${idx + 1}`;
              const price = numOpt(p?.price);
              let percent = numOpt(p?.percent);
              if (percent !== undefined) {
                if (percent < 0) percent = 0;
                if (percent > 100) percent = 100;
              }
              const at = strTrim(p?.at);
              const note = strTrim(p?.note);
              if (!label && price === undefined && percent === undefined && !at && !note) {
                return null;
              }
              return { label: label ?? undefined, price, percent, at, note };
            })
            .filter(Boolean)
        : undefined;

      const payload: any = {
        ...vals,
        userId,
        processIntent: vals.processIntent || undefined,
        processFocus: Array.isArray(vals.processFocus) ? vals.processFocus : undefined,
        ifThenPlan: vals.ifThenPlan || undefined,
        processAdherence: Number(vals.processAdherence ?? 0),
        tiltNoticed: !!vals.tiltNoticed,
        cooldownDone: !!vals.cooldownDone,
        processDebrief: vals.processDebrief || undefined,
        hidePnLUntilDebrief: !!vals.hidePnLUntilDebrief,
        entry: num(vals.entry),
        exit: num(vals.exit),
        pnl: num(vals.pnl),
        lotSize: numOpt(vals.lotSize),
        potentialLoss: numOpt(vals.potentialLoss),
        disciplineScore: num(vals.disciplineScore),
        rating: vals?.rating !== undefined ? num(vals.rating) : undefined,
        durationMin: num(vals.durationMin ?? minutesBetween(vals.startTime, vals.endTime)),
        outcomeFlags: {
          breakEven: !!vals?.outcomeFlags?.breakEven,
          stopHit: !!vals?.outcomeFlags?.stopHit,
        },
        luckFactor: (vals.luckFactor === "positive" || vals.luckFactor === "negative" || vals.luckFactor === "neutral")
          ? vals.luckFactor
          : "neutral",
        processNotes: typeof vals.processNotes === "string" ? vals.processNotes.trim() : undefined,
        tradingMistakes: Array.isArray(vals.tradingMistakes) ? vals.tradingMistakes : [],
        viewTimeframes: Array.isArray(vals.viewTimeframes) ? vals.viewTimeframes : [],
        concepts: Array.isArray(vals.concepts)
          ? vals.concepts.map((c: any) => ({
              name: String(c?.name || ""),
              direction: c?.direction || undefined,
              timeframe: String(c?.timeframe || ""),
              note: c?.note ? String(c.note) : undefined,
            }))
          : [],
        gameItems: Array.isArray(vals.gameItems) ? vals.gameItems : [],
        gameSelf: vals.gameSelf ?? undefined,
        gameCatalogScore: num(vals.gameCatalogScore),
        gameCatalogGrade: vals.gameCatalogGrade ?? undefined,
        gameComputed: preferredGrade,  // ⚠️ hier bleibt's bei A/B/C
        strategy: vals.strategy ?? vals.strategy_name ?? undefined,
        strategyAdherence: vals.strategyAdherence ?? undefined,
        hasPartialExits: !!vals.hasPartialExits,
        partialExits: vals.hasPartialExits && partialExitsSan && partialExitsSan.length
          ? partialExitsSan
          : undefined,
        missing,
        status: finalStatus,
        completed: finalStatus === "final",
      };

      if ((initialData as any)?._id) {
        const resp = await fetch(`/api/trading/update?id=${(initialData as any)._id}&userId=${userId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!resp.ok) throw new Error(`Update fehlgeschlagen: ${resp.status}`);
        onUpdated?.() ?? onCreated?.();
      } else {
        const resp = await fetch("/api/trading/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!resp.ok) throw new Error(`Create fehlgeschlagen: ${resp.status}`);
        onCreated?.();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setPending(false);
    }
  };

  const onSubmitFinal = (vals: FormValues) => onSubmit(vals, "final");

  /** ---------- UI ---------- */
  return (
    <FormProvider {...methods}>
      <Card className="w-full max-h-[85vh] flex flex-col">
        <form onSubmit={handleSubmit(onSubmitFinal)} className="flex flex-col min-h-0">
          {/* Header */}
          <CardHeader className="flex items-center justify-between sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
            <CardTitle>{initialData ? "Trade bearbeiten" : "Neuer Trade"}</CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant={gradeBadgeVariant(liveDisplayGrade)} className="text-sm">
                Game: {liveDisplayGrade}
              </Badge>
              <Badge variant="outline" className="text-sm">
                Disziplin: {Math.round(Number(v.disciplineScore ?? 0))}%
              </Badge>
              {v.durationMin ? (
                <Badge className="text-sm" variant="outline">
                  Dauer: {v.durationMin} Min
                </Badge>
              ) : null}
            </div>
          </CardHeader>

          {/* Content */}
          <CardContent className="flex-1 min-h-0 overflow-y-auto px-4">
            <Tabs defaultValue="general" className="space-y-4">
              <TabsList className="flex w-full overflow-x-auto whitespace-nowrap">
                <TabsTrigger value="general">General</TabsTrigger>
                <TabsTrigger value="strategy">Strategie</TabsTrigger>
                <TabsTrigger value="trading-game">Trading Game</TabsTrigger>
              </TabsList>

              {/* --- GENERAL --- */}
              <TabsContent value="general" className="space-y-6">
                <TEFGeneral userId={userId} />
              </TabsContent>

              {/* --- STRATEGY --- */}
              <TabsContent value="strategy">
                <TEFStrategy userId={userId} />
              </TabsContent>

              {/* --- TRADING GAME --- */}
              <TabsContent value="trading-game" className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    Wähle die erfüllten Faktoren – daraus wird Ø-Punkte &amp; Game berechnet.
                    {/** kleine Hilfe zur S-Regel */}
                    <div className="text-xs mt-1 opacity-70">
                      S-Game: mindestens <b>3× A</b> ausgewählt und <b>keine</b> B/C-Faktoren aktiv.
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={gradeBadgeVariant(liveDisplayGrade)}>
                      Game: {liveDisplayGrade}
                    </Badge>
                    <Badge variant="outline">Ø Punkte: {(v.gameCatalogScore ?? 0).toFixed(2)}</Badge>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {(["A", "B", "C"] as const).map((grade) => (
                    <div key={grade} className="border rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-sm font-medium">{grade}-Game</div>
                        <Badge variant={grade === "A" ? "default" : grade === "B" ? "secondary" : "outline"}>
                          {grade === "A" ? "3 Punkte" : grade === "B" ? "2 Punkte" : "1 Punkt"}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {itemsByGrade[grade].length === 0 && (
                          <div className="text-xs text-muted-foreground">Keine Items.</div>
                        )}
                        {itemsByGrade[grade].map((it) => {
                          const key = `${grade}:${it.label}`;
                          const active = (v.gameItems ?? []).includes(key);
                          return (
                            <button
                              key={key}
                              type="button"
                              className={[
                                "px-2 py-1 text-xs rounded-md border",
                                active ? "bg-primary text-primary-foreground" : "bg-secondary"
                              ].join(" ")}
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => toggleGameItem(grade, it.label)}
                              aria-pressed={active}
                              title={it.label}
                            >
                              {it.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>

          {/* Sticky Footer */}
          <CardFooter className="mt-auto flex items-center justify-end gap-2 border-t p-4 bg-background">
            <Button
              type="button"
              variant="secondary"
              onClick={() => methods.handleSubmit((vals) => onSubmit(vals, "draft"))()}
              title="Speichert den Trade als unvollständig (Entwurf)"
              disabled={pending}
            >
              Als Entwurf speichern
            </Button>
            <Button
              type="submit"
              title="Speichert als final – falls noch Pflichtfelder fehlen, wird automatisch als Entwurf gespeichert"
              disabled={pending}
            >
              Speichern (Final)
            </Button>
          </CardFooter>
        </form>
      </Card>
    </FormProvider>
  );
}
