"use client";

import React, { useMemo, useEffect } from "react";
import { FormProvider, useForm, useFieldArray } from "react-hook-form";
import useSWR from "swr";
import { TradeEntry, Account, GameLibrary } from "@/utils/interface";

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

const fetcher = (url: string) => fetch(url).then((r) => r.json());

/* --- Konstanten --- */
const SESSIONS = ["Asia", "London", "NewYork", "Overlap"] as const;
type SessionKey = (typeof SESSIONS)[number];

type BiasExec = "RR" | "RW" | "WR" | "WW";

/* Fallback-Library für mentale Fehler */
const DEFAULT_EMOTION_LIBRARY: { name: string; items: string[] }[] = [
  { name: "Angst", items: ["Exit zu früh", "Trade verpasst", "Nicht geklickt"] },
  { name: "Gier", items: ["Overtrading", "Zu spät rein", "Zu viele Adds"] },
  { name: "Wut", items: ["Revenge", "Plan ignoriert", "SL verschoben"] },
  { name: "Overconfidence", items: ["Size zu groß", "Kein SL gesetzt"] },
  { name: "Undiszipliniert", items: ["Regelbruch", "Ablenkung", "Impulsiv"] },
];

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

/** Pflichtfelder prüfen – Draft, wenn etwas fehlt */
function computeMissingFields(values: any) {
  const missing: string[] = [];
  const need = {
    accountId: !!values.accountId,
    symbol: !!values.symbol,
    tradeType: !!values.tradeType,
    entry: Number.isFinite(Number(values.entry)),
    exit: Number.isFinite(Number(values.exit)),
    result: values.result && values.result !== "ongoing",
  };
  Object.entries(need).forEach(([k, ok]) => { if (!ok) missing.push(k); });

  if (values.result === "BE") {
    const i = missing.indexOf("pnl");
    if (i >= 0) missing.splice(i, 1);
  }
  if (values.result === "ongoing") {
    const i = missing.indexOf("result");
    if (i >= 0) missing.splice(i, 1);
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
  at?: string;      // ISO-String oder ""
  note?: string;
};

/** -------- A/B/C Game Library Item -------- */
type GameItem = {
  _id: string;
  userId: string;
  label: string;
  game: "A" | "B" | "C";
  points?: number; // default A=3, B=2, C=1
  active?: boolean;
  tags?: string[];
};

interface Props {
  date: string;
  userId: string;
  onCreated: () => void;
  initialData?: TradeEntry;
}

export default function TradeEntryForm({
  date, userId, onCreated, initialData,
}: Props) {
  // --- Form Setup
  const methods = useForm<TradeEntry & {
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
  }>({
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
      notes: initialData?.notes || "",
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
      partialExits: Array.isArray((initialData as any)?.partialExits)
        ? ((initialData as any)?.partialExits as any[]).map((p) => ({
            label: p?.label ?? "",
            price: Number.isFinite(Number(p?.price)) ? Number(p?.price) : undefined,
            percent: Number.isFinite(Number(p?.percent)) ? Number(p?.percent) : undefined,
            at: p?.at ?? "",
            note: p?.note ?? "",
          }))
        : [],
    } as any,
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

  /* -------- 🆕 A/B/C Game Library laden (richtige API-Struktur: { items }) -------- */
 // 🆕 A/B/C Game Library laden (neues Response-Format: { items, nextCursor, summary })
type GameLibItem = { _id: string; userId: string; label: string; game: "A" | "B" | "C"; points?: number; active?: boolean };

const { data: gameLibRes, error: gameLibErr, isLoading: gameLibLoading } = useSWR<{
  items: GameLibItem[];
  nextCursor?: string | null;
  summary?: any;
}>(
  userId ? `/api/trading/gameLibrary?userId=${userId}&active=true&limit=500` : null,
  fetcher
);

// Sichtbares Logging zum Debuggen (kannst du später wieder entfernen)
useEffect(() => {
  if (userId) {
    console.log("[TEF] gameLibrary response:", { count: gameLibRes?.items?.length ?? 0, items: gameLibRes?.items });
    if (gameLibErr) console.warn("[TEF] gameLibrary error:", gameLibErr);
  }
}, [userId, gameLibRes, gameLibErr]);

// Items → Gruppen A/B/C mappen
const gameLib: GameLibrary = useMemo(() => {
  const A: string[] = [], B: string[] = [], C: string[] = [];
  const items = Array.isArray(gameLibRes?.items) ? gameLibRes!.items : [];
  for (const it of items) {
    if (!it?.label || !it?.game) continue;
    if (it.game === "A") A.push(it.label);
    else if (it.game === "B") B.push(it.label);
    else if (it.game === "C") C.push(it.label);
  }
  return { A, B, C };
}, [gameLibRes?.items]);

  const gameItems = gameLibRes?.items ?? [];

  const itemsByGrade = useMemo(() => {
    return {
      A: gameItems.filter((i) => i.game === "A"),
      B: gameItems.filter((i) => i.game === "B"),
      C: gameItems.filter((i) => i.game === "C"),
    };
  }, [gameItems]);

  // Map für Punkte je Auswahl-Key ("A:Label" etc.)
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

  // Live-Game (Bias/Exec/Mistakes -> separater Heuristik-Score)
  const gameComputedLive = useMemo(() => {
    const r = computeGameScore({
      biasExecution: v.biasExecution as BiasExec | undefined,
      followedSetup: v.followedSetup,
      respectedStopLoss: v.respectedStopLoss,
      managedRisk: v.managedRisk,
      conceptsCount: v.concepts?.length ?? 0,
      session: v.session as SessionKey | undefined,
      result: v.result,
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

  /* -------- 🆕 Game Items toggeln -------- */
  const toggleGameItem = (grade: "A" | "B" | "C", label: string) => {
    const cur = new Set<string>(Array.isArray(v.gameItems) ? v.gameItems : []);
    const key = `${grade}:${label}`;
    if (cur.has(key)) cur.delete(key);
    else cur.add(key);
    setValue("gameItems", Array.from(cur), { shouldDirty: true });
  };

  /* -------- 🆕 Score/Grade aus selektierten GameItems berechnen (Ø Punkte) -------- */
  useEffect(() => {
    const selected = Array.isArray(v.gameItems) ? v.gameItems : [];
    const n = selected.length;
    let sum = 0;
    for (const k of selected) sum += pointsMap.get(k) ?? 0;
    const avg = n > 0 ? sum / n : 0;
    // Grade aus Ø-Punkten ableiten
    const grade: "A" | "B" | "C" = avg >= 2.5 ? "A" : avg >= 1.5 ? "B" : "C";

    if ((v.gameCatalogScore ?? 0) !== Number(avg.toFixed(2))) {
      setValue("gameCatalogScore", Number(avg.toFixed(2)), { shouldDirty: true });
    }
    if (v.gameCatalogGrade !== grade) {
      setValue("gameCatalogGrade", grade, { shouldDirty: true });
    }
  }, [v.gameItems, pointsMap, setValue, v.gameCatalogScore, v.gameCatalogGrade]);

  // Prozent-Summe Partial Exits
  const percentSum = useMemo(() => {
    const arr = Array.isArray(v.partialExits) ? v.partialExits : [];
    return arr.reduce((acc, it) => {
      const n = Number(it?.percent);
      return acc + (Number.isFinite(n) ? n : 0);
    }, 0);
  }, [v.partialExits]);

  // SUBMIT (final/draft)
  const onSubmit = async (values: any, forceStatus?: "final" | "draft") => {
    setPending(true);
    try {
      const missing = computeMissingFields(values);

      // ongoing ⇒ Draft + kein result übertragen
      let forceDraftByOngoing = false;
      if (values.result === "ongoing") {
        forceDraftByOngoing = true;
        values = { ...values };
        delete values.result;
      }

      // Partial-Exits: Validierung Summe ≤ 100
      if (values.hasPartialExits) {
        const sum = (Array.isArray(values.partialExits) ? values.partialExits : []).reduce(
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

      const preferredGrade: "A" | "B" | "C" =
        (values.gameCatalogGrade as "A" | "B" | "C" | undefined) ??
        (values.gameSelf as "A" | "B" | "C" | undefined) ??
        computeGameScore({
          biasExecution: values.biasExecution,
          followedSetup: values.followedSetup,
          respectedStopLoss: values.respectedStopLoss,
          managedRisk: values.managedRisk,
          conceptsCount: values.concepts?.length ?? 0,
          session: values.session,
          result: values.result,
          breakEven: values.outcomeFlags?.breakEven,
          stopHit: values.outcomeFlags?.stopHit,
          mistakes: values.tradingMistakes,
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
      const partialExitsSan = Array.isArray(values.partialExits)
        ? values.partialExits
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
        ...values,
        userId,
        entry: num(values.entry),
        exit: num(values.exit),
        pnl: num(values.pnl),
        lotSize: numOpt(values.lotSize),
        potentialLoss: numOpt(values.potentialLoss),
        disciplineScore: num(values.disciplineScore),
        rating: values?.rating !== undefined ? num(values.rating) : undefined,
        durationMin: num(values.durationMin ?? minutesBetween(values.startTime, values.endTime)),
        outcomeFlags: {
          breakEven: !!values?.outcomeFlags?.breakEven,
          stopHit: !!values?.outcomeFlags?.stopHit,
        },
        tradingMistakes: Array.isArray(values.tradingMistakes) ? values.tradingMistakes : [],
        viewTimeframes: Array.isArray(values.viewTimeframes) ? values.viewTimeframes : [],
        concepts: Array.isArray(values.concepts)
          ? values.concepts.map((c: any) => ({
              name: String(c?.name || ""),
              direction: c?.direction || undefined,
              timeframe: String(c?.timeframe || ""),
              note: c?.note ? String(c.note) : undefined,
            }))
          : [],
        gameItems: Array.isArray(values.gameItems) ? values.gameItems : [],
        gameSelf: values.gameSelf ?? undefined,
        gameCatalogScore: num(values.gameCatalogScore),
        gameCatalogGrade: values.gameCatalogGrade ?? undefined,
        gameComputed: preferredGrade,
        strategy: values.strategy ?? values.strategy_name ?? undefined,
        strategyAdherence: values.strategyAdherence ?? undefined,
        hasPartialExits: !!values.hasPartialExits,
        partialExits: values.hasPartialExits && partialExitsSan && partialExitsSan.length
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
      } else {
        const resp = await fetch("/api/trading/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!resp.ok) throw new Error(`Create fehlgeschlagen: ${resp.status}`);
      }

      onCreated();
    } catch (e) {
      console.error(e);
    } finally {
      setPending(false);
    }
  };

  const onSubmitFinal = (vals: any) => onSubmit(vals, "final");
  const onSubmitDraft = (vals: any) => onSubmit(vals, "draft");

  /** ---------- UI ---------- */
  return (
    <FormProvider {...methods}>
      <Card className="w-full max-h-[85vh] flex flex-col">
        <form onSubmit={handleSubmit(onSubmitFinal)} className="flex flex-col min-h-0">
          {/* Header */}
          <CardHeader className="flex items-center justify-between sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
            <CardTitle>{initialData ? "Trade bearbeiten" : "Neuer Trade"}</CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-sm">
                Game: {(v.gameCatalogGrade as "A" | "B" | "C" | undefined) ?? v.gameSelf ?? gameComputedLive.grade}
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
                {/* 🆕 neuer Tab */}
                <TabsTrigger value="trading-game">Trading Game</TabsTrigger>
              </TabsList>

              {/* --- GENERAL --- */}
              <TabsContent value="general" className="space-y-6">
                <TEFGeneral userId={userId} />

                {/* Zeiten & Session */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField control={control} name="startTime" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Startzeit</FormLabel>
                      <FormControl><Input type="time" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={control} name="endTime" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Endzeit</FormLabel>
                      <FormControl><Input type="time" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={control} name="session" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Session</FormLabel>
                      <FormControl>
                        <Select value={field.value || ""} onValueChange={field.onChange}>
                          <SelectTrigger className="w-full"><SelectValue placeholder="Session wählen" /></SelectTrigger>
                          <SelectContent>
                            {SESSIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                {/* Outcome & Bias */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField control={control} name="outcomeFlags.breakEven" render={({ field }) => (
                    <FormItem className="flex items-center gap-3">
                      <FormControl><Checkbox checked={!!field.value} onCheckedChange={field.onChange} /></FormControl>
                      <FormLabel className="m-0">Break Even</FormLabel>
                    </FormItem>
                  )} />
                  <FormField control={control} name="outcomeFlags.stopHit" render={({ field }) => (
                    <FormItem className="flex items-center gap-3">
                      <FormControl><Checkbox checked={!!field.value} onCheckedChange={field.onChange} /></FormControl>
                      <FormLabel className="m-0">Stop Hit</FormLabel>
                    </FormItem>
                  )} />
                  <FormField control={control} name="biasExecution" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bias/Execution</FormLabel>
                      <FormControl>
                        <Select value={field.value || ""} onValueChange={field.onChange}>
                          <SelectTrigger className="w-full"><SelectValue placeholder="Bias wählen" /></SelectTrigger>
                          <SelectContent>
                            {(["RR", "RW", "WR", "WW"] as BiasExec[]).map((b) => (
                              <SelectItem key={b} value={b}>{b}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                {/* Mentale Fehler */}
                <div className="space-y-2">
                  <FormLabel>Mentale Fehler</FormLabel>
                  <div
                    className="flex flex-wrap gap-2"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {allMistakeChoices.map((m) => {
                      const active = (v.tradingMistakes ?? []).includes(m);
                      return (
                        <button
                          key={m}
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            toggleMistake(m);
                          }}
                          className={[
                            "px-3 py-1 rounded-md text-sm border",
                            active ? "bg-primary text-primary-foreground" : "bg-secondary"
                          ].join(" ")}
                          aria-pressed={active}
                        >
                          {m}
                        </button>
                      );
                    })}
                  </div>
                  <FormField
                    control={control}
                    name="customMistake"
                    render={({ field }) => (
                      <FormItem className="mt-2">
                        <FormLabel className="text-xs text-muted-foreground">Eigenen Punkt hinzufügen</FormLabel>
                        <div className="flex gap-2">
                          <FormControl>
                            <Input
                              placeholder="z. B. FOMO-ReEntry"
                              value={field.value ?? ""}
                              onChange={field.onChange}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  const val = String(field.value || "").trim();
                                  if (val) {
                                    toggleMistake(val);
                                    field.onChange("");
                                  }
                                }
                              }}
                            />
                          </FormControl>
                          <button
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              const val = String(field.value || "").trim();
                              if (val) {
                                toggleMistake(val);
                                field.onChange("");
                              }
                            }}
                            className="px-3 py-1 rounded-md text-sm border bg-background"
                          >
                            Hinzufügen
                          </button>
                        </div>
                      </FormItem>
                    )}
                  />
                </div>
              </TabsContent>

              {/* --- STRATEGY --- */}
              <TabsContent value="strategy">
                <TEFStrategy userId={userId} />
              </TabsContent>

              {/* --- 🆕 TRADING GAME (A/B/C Faktoren) --- */}
              <TabsContent value="trading-game" className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    Wähle die erfüllten Faktoren – daraus wird Ø-Punkte & Game berechnet.
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={v.gameCatalogGrade === "A" ? "default" : v.gameCatalogGrade === "B" ? "secondary" : "outline"}>
                      Game: {v.gameCatalogGrade ?? "-"}
                    </Badge>
                    <Badge variant="outline">Ø Punkte: {(v.gameCatalogScore ?? 0).toFixed(2)}</Badge>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {(["A","B","C"] as const).map((grade) => (
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
              onClick={() => handleSubmit((vals) => onSubmit(vals, "draft"))()}
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
