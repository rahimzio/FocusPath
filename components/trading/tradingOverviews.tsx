// TradingDashboard.tsx
"use client";

import React, { useState, useEffect, useMemo } from "react";
import dynamic from "next/dynamic";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

import AddTradeModal from "./AddTradeModal";
import TradeRecapList from "./TradeRecapList";
import TradeMetrics from "./TradeMetrics";
import PerformanceChart from "./PerformanceChart";
import TradeReflection from "./TradeReflection";
import MistakePatternChart from "./MistakePatternChart";
import StrategyPills from "./StrategyPills";
import MonthlyStatsOverlay from "./MonthlyStatsOverlay";
import RecapAccordion from "./RecapAccordion";
import TradeEntryFAB from "./TradeEntryFAB";
import WeeklyStatsCard from "./WeeklyStatsCard";
import AccountManager from "./AccountManager";
import AddAccountModal from "./AddAccountModal";
import AddStrategyModal from "./AddStrategyModal";

/* -------- Lazy Imports mit Fallbacks -------- */

// Wish vs Reality
const WishGainVsReality = dynamic(async () => {
  try {
    const mod = await import("./charts/wishgainvsreality");
    return (mod as any).Component ?? (mod as any).default ?? (() => null);
  } catch {
    return function Fallback() {
      return (
        <Card className="w-full max-w-full overflow-hidden">
          <CardHeader><CardTitle>Wish vs Reality</CardTitle></CardHeader>
          <CardContent className="text-sm opacity-70">
            Visualisierung (wishgainvsreality) ist noch nicht vorhanden.
          </CardContent>
        </Card>
      );
    };
  }
}, { ssr: false, loading: () => <div className="opacity-70">Lade…</div> });

// Game Distribution
const GameDistributionCard = dynamic(async () => {
  try {
    const mod = await import("./GameDistributionCard");
    return (mod as any).default ?? (() => null);
  } catch {
    return function Fallback() {
      return (
        <Card className="w-full max-w-full overflow-hidden">
          <CardHeader><CardTitle>Game Distribution</CardTitle></CardHeader>
          <CardContent className="text-sm opacity-70">
            Die Game-Distribution-Komponente ist noch nicht verfügbar.
          </CardContent>
        </Card>
      );
    };
  }
}, { ssr: false, loading: () => <div className="opacity-70">Lade…</div> });

// GameLibrary
const GameLibrary = dynamic<{ userId: string }>(
  async () => {
    try {
      const mod = await import("./GameLibrary");
      return (mod as any).default ?? (() => null);
    } catch {
      return function Fallback() {
        return (
          <Card className="w-full max-w-full overflow-hidden">
            <CardHeader><CardTitle>Game Library</CardTitle></CardHeader>
            <CardContent className="text-sm opacity-70">
              Die GameLibrary-Komponente ist noch nicht verfügbar.
            </CardContent>
          </Card>
        );
      };
    }
  }, { ssr: false, loading: () => <div className="opacity-70">Lade…</div> }
);

// GamePicker
const GamePicker = dynamic<{ userId: string }>(
  async () => {
    try {
      const mod = await import("./GamePicker");
      return (mod as any).default ?? (() => null);
    } catch {
      return function Fallback() {
        return (
          <Card className="w-full max-w-full overflow-hidden">
            <CardHeader><CardTitle>Game Picker</CardTitle></CardHeader>
            <CardContent className="text-sm opacity-70">
              Die GamePicker-Komponente ist noch nicht verfügbar.
            </CardContent>
          </Card>
        );
      };
    }
  },
  { ssr: false, loading: () => <div className="opacity-70">Lade…</div> }
);

// Inchworm / Improvement
const InchwormPlanner = dynamic<{ userId: string }>(
  async () => {
    try {
      const mod = await import("./inchworm/InchwormPlanner");
      return (mod as any).default ?? (() => null);
    } catch {
      return function Fallback() {
        return (
          <Card className="w-full max-w-full overflow-hidden">
            <CardHeader><CardTitle>Inchworm Planner</CardTitle></CardHeader>
            <CardContent className="text-sm opacity-70">
              Der Inchworm-Planner ist noch nicht verfügbar.
            </CardContent>
          </Card>
        );
      };
    }
  },
  { ssr: false, loading: () => <div className="opacity-70">Lade…</div> }
);
const GameProgressPlanAware = dynamic<{ userId: string }>(
  async () => {
    const mod = await import("./inchworm/GameProgressPlanAware");
    return (mod as any).default ?? (() => null);
  },
  { ssr: false, loading: () => <div className="opacity-70">Lade…</div> }
);

// ✅ Monats-Verteilung (plan-unabhängig)
const GameProgressMonthly = dynamic<{ userId: string }>(
  async () => {
    const mod = await import("./GameProgressMonthly");
    return (mod as any).default ?? (() => null);
  },
  { ssr: false, loading: () => <div className="opacity-70">Lade…</div> }
);

const GameProgressTracker = dynamic<{ userId: string }>(
  async () => {
    try {
      const mod = await import("./inchworm/GameProgressTracker");
      return (mod as any).default ?? (() => null);
    } catch {
      return function Fallback() {
        return (
          <Card className="w-full max-w-full overflow-hidden">
            <CardHeader><CardTitle>Game Progress</CardTitle></CardHeader>
            <CardContent className="text-sm opacity-70">
              Der Game-Progress-Tracker ist noch nicht verfügbar.
            </CardContent>
          </Card>
        );
      };
    }
  },
  { ssr: false, loading: () => <div className="opacity-70">Lade…</div> }
);

const GameDrillboard = dynamic<{ userId: string }>(
  async () => {
    try {
      const mod = await import("./inchworm/GameDrillboard");
      return (mod as any).default ?? (() => null);
    } catch {
      return function Fallback() {
        return (
          <Card className="w-full max-w-full overflow-hidden">
            <CardHeader><CardTitle>Game Drillboard</CardTitle></CardHeader>
            <CardContent className="text-sm opacity-70">
              Das Drillboard ist noch nicht verfügbar.
            </CardContent>
          </Card>
        );
      };
    }
  },
  { ssr: false, loading: () => <div className="opacity-70">Lade…</div> }
);

const InchwormProgress = dynamic<{ userId: string }>(
  async () => {
    try {
      const mod = await import("./inchworm/InchwormProgress");
      return (mod as any).default ?? (() => null);
    } catch {
      return function Fallback() {
        return (
          <Card className="w-full max-w-full overflow-hidden">
            <CardHeader><CardTitle>Inchworm Progress</CardTitle></CardHeader>
            <CardContent className="text-sm opacity-70">
              Die Inchworm-Progress-Komponente ist noch nicht verfügbar.
            </CardContent>
          </Card>
        );
      };
    }
  },
  { ssr: false, loading: () => <div className="opacity-70">Lade…</div> }
);

const GameImprovementPlanner = dynamic<{ userId: string }>(
  async () => {
    try {
      const mod = await import("./inchworm/GameImprovementPlanner");
      return (mod as any).default ?? (() => null);
    } catch {
      return function Fallback() {
        return (
          <Card className="w-full max-w-full overflow-hidden">
            <CardHeader><CardTitle>Game Improvement Planner</CardTitle></CardHeader>
            <CardContent className="text-sm opacity-70">
              Der Game-Improvement-Planner ist noch nicht verfügbar.
            </CardContent>
          </Card>
        );
      };
    }
  },
  { ssr: false, loading: () => <div className="opacity-70">Lade…</div> }
);

/* 🔹 NEU: Day Reflection (lazy) */
const TradeDayReflection = dynamic<{ userId: string }>(
  async () => {
    try {
      const mod = await import("./TradeDayReflection");
      return (mod as any).default ?? (() => null);
    } catch {
      return function Fallback() {
        return (
          <Card className="w-full max-w-full overflow-hidden">
            <CardHeader><CardTitle>Day Reflection</CardTitle></CardHeader>
            <CardContent className="text-sm opacity-70">
              Die Day-Reflection-Komponente ist noch nicht verfügbar.
            </CardContent>
          </Card>
        );
      };
    }
  },
  { ssr: false, loading: () => <div className="opacity-70">Lade…</div> }
);

/* 🔹 NEU: WeeklyTradingReflection & TradingHistory (lazy) */
const WeeklyTradingReflection = dynamic<{ userId: string; label: string }>(
  async () => {
    try {
      const mod = await import("./WeeklyTradingReflection");
      return (mod as any).default ?? (() => null);
    } catch {
      return function Fallback() {
        return (
          <Card className="w-full max-w-full overflow-hidden">
            <CardHeader><CardTitle>Weekly Review</CardTitle></CardHeader>
            <CardContent className="text-sm opacity-70">
              Die WeeklyTradingReflection-Komponente ist noch nicht verfügbar.
            </CardContent>
          </Card>
        );
      };
    }
  },
  { ssr: false, loading: () => <div className="opacity-70">Lade…</div> }
);

const TradingHistory = dynamic<{ userId: string }>(
  async () => {
    try {
      const mod = await import("./TradingHistory");
      return (mod as any).default ?? (() => null);
    } catch {
      return function Fallback() {
        return (
          <Card className="w-full max-w-full overflow-hidden">
            <CardHeader><CardTitle>History (Week/Month/Quarter)</CardTitle></CardHeader>
            <CardContent className="text-sm opacity-70">
              Die TradingHistory-Komponente ist noch nicht verfügbar.
            </CardContent>
          </Card>
        );
      };
    }
  },
  { ssr: false, loading: () => <div className="opacity-70">Lade…</div> }
);

/* 🔹 NEU: StatsDashboard (lazy) */
const StatsDashboard = dynamic<{ userId: string }>(
  async () => {
    try {
      const mod = await import("./StatsDashboard");
      return (mod as any).default ?? (() => null);
    } catch {
      return function Fallback() {
        return (
          <Card className="w-full max-w-full overflow-hidden">
            <CardHeader><CardTitle>Persönliche Stats</CardTitle></CardHeader>
            <CardContent className="text-sm opacity-70">
              Die StatsDashboard-Komponente ist noch nicht verfügbar.
            </CardContent>
          </Card>
        );
      };
    }
  },
  { ssr: false, loading: () => <div className="opacity-70">Lade…</div> }
);

/* ------------------------------------------------------------------
   Inline-Komponente für Improve-Überblick
------------------------------------------------------------------- */
function ImproveAtAGlance({
  onJump,
}: {
  onJump: (target: "planner" | "progress" | "drillboard" | "improvement-planner") => void;
}) {
  const [todayDrill, setTodayDrill] = useState<string>("");
  const [focus, setFocus] = useState<string>("");
  const [period, setPeriod] = useState<string>("");
  const [todayGrade, setTodayGrade] = useState<"A" | "B" | "C" | "-">("-");

  useEffect(() => {
    try {
      setTodayDrill(localStorage.getItem("inchworm:todayDrill") || "");
      setFocus(localStorage.getItem("inchworm:focus") || "");
      setPeriod(localStorage.getItem("inchworm:period") || "");
    } catch { }
  }, []);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (!e.key) return;
      if (e.key.startsWith("inchworm:")) {
        try {
          setTodayDrill(localStorage.getItem("inchworm:todayDrill") || "");
          setFocus(localStorage.getItem("inchworm:focus") || "");
          setPeriod(localStorage.getItem("inchworm:period") || "");
        } catch { }
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => {
    const handler = (e: any) => {
      const g = e?.detail?.grade;
      if (g === "A" || g === "B" || g === "C") setTodayGrade(g);
    };
    window.addEventListener("game-picker-change", handler as any);
    return () => window.removeEventListener("game-picker-change", handler as any);
  }, []);

  return (
    <Card className="mb-4 w-full max-w-full overflow-hidden">
      <CardHeader>
        <CardTitle>Improve – Überblick</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="rounded-lg border p-3">
          <div className="text-xs text-muted-foreground mb-1">Aktiver Zeitraum</div>
          <div className="font-medium">{period || "— noch kein Zeitraum gesetzt —"}</div>
          <Button variant="ghost" size="sm" className="mt-2" onClick={() => onJump("planner")}>
            Zeitraum & Ziele setzen
          </Button>
        </div>

        <div className="rounded-lg border p-3">
          <div className="text-xs text-muted-foreground mb-1">Heutiger Drill</div>
          <div className="font-medium break-words">{todayDrill || "— noch kein Drill geplant —"}</div>
          <Button variant="ghost" size="sm" className="mt-2" onClick={() => onJump("drillboard")}>
            Drillboard öffnen
          </Button>
        </div>

        <div className="rounded-lg border p-3">
          <div className="text-xs text-muted-foreground mb-1">Fokus (Inchworm)</div>
          <div className="font-medium break-words">{focus || "— noch kein Fokus gesetzt —"}</div>
          <div className="text-xs mt-2">Tages-Game: <b>{todayGrade}</b></div>
          <Button variant="ghost" size="sm" className="mt-2" onClick={() => onJump("progress")}>
            Fortschritt ansehen
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/* Helper – aktuelles Monats-Segment (W1..W4) als Label "YYYY-MM Wn" */
function currentMonthSegmentLabel(d = new Date()): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = d.getUTCDate();
  let w: "W1" | "W2" | "W3" | "W4" = "W1";
  if (day >= 22) w = "W4";
  else if (day >= 15) w = "W3";
  else if (day >= 8) w = "W2";
  else w = "W1";
  return `${y}-${m} ${w}`;
}

export default function TradingDashboard() {
  const { data: session } = useSession();
  const userId = session?.user?.id as string | undefined;
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [tab, setTab] = useState<"overview" | "game" | "improve" | "components" | "accounts" | "review" | "settings">("overview");

  /* ⚙️ NEU: Globaler Metrics-Zeitraum */
  const [metricsRange, setMetricsRange] = useState<"week" | "month" | "all">("week");

  /* Weekly Label für Review-Tab (vorbelegt) */
  const defaultWeekLabel = useMemo(() => currentMonthSegmentLabel(new Date()), []);
  const [weekLabel, setWeekLabel] = useState<string>(defaultWeekLabel);

  useEffect(() => {
    try {
      const url = new URL(window.location.href);

      const t = url.searchParams.get("tab");
      if (t === "game" || t === "components" || t === "accounts" || t === "overview" || t === "improve" || t === "review" || t === "settings") {
        setTab(t as any);
      }

      const wl = url.searchParams.get("weekLabel");
      if (wl) setWeekLabel(wl);

      // ⚙️ Range: URL > localStorage > default
      const r = url.searchParams.get("range");
      if (r === "week" || r === "month" || r === "all") {
        setMetricsRange(r);
      } else {
        const ls = localStorage.getItem("trading:metricsRange");
        if (ls === "week" || ls === "month" || ls === "all") setMetricsRange(ls as any);
      }
    } catch { }
  }, []);

  // ⚙️ Persistiere Auswahl in URL + localStorage
  useEffect(() => {
    try {
      const u = new URL(window.location.href);
      u.searchParams.set("range", metricsRange);
      window.history.replaceState({}, "", u.toString());
      localStorage.setItem("trading:metricsRange", metricsRange);
    } catch { }
  }, [metricsRange]);

  if (!userId) return <p className="px-3">Bitte einloggen...</p>;

  const jumpToImprove = (anchor: "planner" | "progress" | "drillboard" | "improvement-planner") => {
    setTab("improve");
    try {
      const u = new URL(window.location.href);
      u.searchParams.set("tab", "improve");
      window.history.replaceState({}, "", u.toString());
    } catch { }
    setTimeout(() => {
      const el = document.getElementById(anchor);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  };

  const gotoReview = () => {
    setTab("review");
    try {
      const u = new URL(window.location.href);
      u.searchParams.set("tab", "review");
      u.searchParams.set("weekLabel", weekLabel);
      window.history.replaceState({}, "", u.toString());
    } catch { }
  };

  return (
    <div className="mx-auto w-full max-w-screen-lg px-3 sm:px-4 space-y-6 overflow-x-hidden break-words min-w-0">
      {/* Header & Quick Metrics */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 min-w-0 w/full">
        <h1 className="text-2xl font-semibold w-full sm:w-auto">Trading Dashboard</h1>
        <div className="w-full sm:w-auto max-w-full min-w-0 overflow-hidden">
          {/* ⚙️ globaler Zeitraum wird an TradeMetrics durchgereicht */}
          <TradeMetrics userId={userId} range={metricsRange} />
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-2 w-full max-w-full min-w-0">
        <AddTradeModal userId={userId} />
        <Button variant="secondary" onClick={() => setFiltersOpen(!filtersOpen)}>Filter</Button>
        <AddStrategyModal userId={userId} />
        <AddAccountModal userId={userId} />
        <Button
          variant="outline"
          onClick={() => {
            setTab("game");
            try {
              const u = new URL(window.location.href);
              u.searchParams.set("tab", "game");
              window.history.replaceState({}, "", u.toString());
            } catch { }
          }}
          title="A/B/C Game Kriterien festlegen und Tages-Game wählen"
          className="whitespace-nowrap"
        >
          A/B/C Game setzen
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            setTab("improve");
            try {
              const u = new URL(window.location.href);
              u.searchParams.set("tab", "improve");
              window.history.replaceState({}, "", u.toString());
            } catch { }
          }}
          title="Inchworm: Monats-Ziele, Drills & Fortschritt"
          className="whitespace-nowrap"
        >
          Improve (Inchworm)
        </Button>

        {/* Quick-Button für Review/History */}
        <div className="flex items-center gap-2">
          <input
            className="border rounded px-2 py-1 text-sm"
            value={weekLabel}
            onChange={(e) => setWeekLabel(e.target.value)}
            title='Week Label im Format "YYYY-MM Wn" (z. B. "2025-09 W3")'
          />
          <Button variant="outline" onClick={gotoReview} className="whitespace-nowrap" title="Weekly Review & History öffnen">
            Review (Week/Month/Quarter)
          </Button>
        </div>
      </div>

      {/* Main Tabs */}
      <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="space-y-4 w-full max-w-full min-w-0">
        <TabsList className="w-full overflow-x-auto whitespace-nowrap flex gap-1 p-1 min-w-0">
          <TabsTrigger value="overview" className="flex-1 sm:flex-none min-w-[110px]">Übersicht</TabsTrigger>
          <TabsTrigger value="game" className="flex-1 sm:flex-none min-w-[110px]">Game</TabsTrigger>
          <TabsTrigger value="improve" className="flex-1 sm:flex-none min-w-[110px]">Improve</TabsTrigger>
          <TabsTrigger value="review" className="flex-1 sm:flex-none min-w-[110px]">Review</TabsTrigger>
          <TabsTrigger value="components" className="flex-1 sm:flex-none min-w-[110px]">Komponenten</TabsTrigger>
          <TabsTrigger value="accounts" className="flex-1 sm:flex-none min-w-[110px]">Accounts</TabsTrigger>
          {/* ⚙️ NEU: Settings */}
          <TabsTrigger value="settings" className="flex-1 sm:flex-none min-w-[110px]">Einstellungen</TabsTrigger>
        </TabsList>

        {/* Übersicht */}
        <TabsContent value="overview" className="min-w-0 w-full max-w-full">
          <ImproveAtAGlance onJump={jumpToImprove} />

          <Card className="mb-4 w-full max-w-full overflow-hidden">
            <CardHeader>
              <CardTitle>Heutiges Game wählen</CardTitle>
            </CardHeader>
            <CardContent className="min-w-0">
              <GamePicker userId={userId} />
            </CardContent>
          </Card>

          {/* Day Reflection */}
          <Card id="day-reflection" className="mb-4 w-full max-w-full overflow-hidden">
            <CardHeader>
              <CardTitle>Day Reflection</CardTitle>
            </CardHeader>
            <CardContent className="min-w-0">
              <TradeDayReflection userId={userId} />
            </CardContent>
          </Card>

          {/* 🔹 NEU: Persönliche Stats */}
          <div className="w-full max-w-full min-w-0">
            <StatsDashboard userId={userId} />
          </div>

          <div className="w-full max-w-full space-y-4 min-w-0">
            <TradeRecapList userId={userId} />
            <div className="w-full max-w-full overflow-hidden">
              <GameDistributionCard />
            </div>
          </div>

          {/* Charts & Reflection Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 min-w-0">
            <Card className="w-full max-w-full min-w-0 overflow-hidden">
              <CardHeader><CardTitle>Performance Chart</CardTitle></CardHeader>
              <CardContent className="min-w-0">
                <PerformanceChart userId={userId} />
              </CardContent>
            </Card>

            <Card className="w-full max-w-full min-w-0 overflow-hidden">
              <CardHeader><CardTitle>Fehler & Reflexion</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-1 gap-4 min-w-0">
                <MistakePatternChart userId={userId} />
                <TradeReflection userId={userId} />
              </CardContent>
            </Card>

            <Card className="md:col-span-2 w-full max-w-full min-w-0 overflow-hidden">
              <CardHeader><CardTitle>Strategien & Monatliche Stats</CardTitle></CardHeader>
              <CardContent className="min-w-0">
                <StrategyPills userId={userId} />
                <MonthlyStatsOverlay userId={userId} />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Game */}
        <TabsContent value="game" className="min-w-0 w-full max-w-full">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 min-w-0">
            <Card id="game-library" className="w-full max-w-full min-w-0 overflow-hidden">
              <CardHeader><CardTitle>Game Library (A/B/C definieren)</CardTitle></CardHeader>
              <CardContent className="min-w-0">
                <GameLibrary userId={userId} />
              </CardContent>
            </Card>

            <Card className="w-full max-w-full min-w-0 overflow-hidden">
              <CardHeader><CardTitle>Game Auswahl</CardTitle></CardHeader>
              <CardContent className="min-w-0">
                <GamePicker userId={userId} />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Improve */}
        <TabsContent value="improve" className="min-w-0 w-full max-w-full">
          <div className="grid grid-cols-1 gap-4 min-w-0">
            {/* 1) Game Progress (Plan-bewusst) */}
            <Card id="progress" className="w-full max-w-full min-w-0 overflow-hidden">
              <CardHeader><CardTitle>Game Progress</CardTitle></CardHeader>
              <CardContent className="min-w-0">
                <GameProgressPlanAware userId={userId} />
              </CardContent>
            </Card>

            {/* 2) Inchworm Planner */}
            <Card id="planner" className="w-full max-w-full min-w-0 overflow-hidden">
              <CardHeader><CardTitle>Inchworm Planner</CardTitle></CardHeader>
              <CardContent className="min-w-0">
                <InchwormPlanner userId={userId} />
              </CardContent>
            </Card>

            {/* 3) Game Progress (Monate, unabhängig vom Plan) */}
            <Card className="w-full max-w-full min-w-0 overflow-hidden">
              <CardHeader><CardTitle>Game Progress (Monate)</CardTitle></CardHeader>
              <CardContent className="min-w-0">
                <GameProgressMonthly userId={userId} />
              </CardContent>
            </Card>

            {/* Rest wie gehabt */}
            <Card id="drillboard" className="w-full max-w-full min-w-0 overflow-hidden">
              <CardHeader><CardTitle>Game Drillboard</CardTitle></CardHeader>
              <CardContent className="min-w-0">
                <GameDrillboard userId={userId} />
              </CardContent>
            </Card>

            <Card id="improvement-planner" className="w-full max-w-full min-w-0 overflow-hidden">
              <CardHeader><CardTitle>Inchworm Progress</CardTitle></CardHeader>
              <CardContent className="min-w-0">
                <InchwormProgress userId={userId} />
              </CardContent>
            </Card>

            <Card className="w-full max-w-full min-w-0 overflow-hidden">
              <CardHeader><CardTitle>Game Improvement Planner</CardTitle></CardHeader>
              <CardContent className="min-w-0">
                <GameImprovementPlanner userId={userId} />
              </CardContent>
            </Card>
          </div>
        </TabsContent>



        {/* Review */}
        <TabsContent value="review" className="min-w-0 w-full max-w-full space-y-4">
          <Card className="w-full max-w-full overflow-hidden">
            <CardHeader>
              <CardTitle>Weekly Review</CardTitle>
            </CardHeader>
            <CardContent className="min-w-0 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <label className="text-sm">Week Label:</label>
                <input
                  className="border rounded px-2 py-1 text-sm"
                  value={weekLabel}
                  onChange={(e) => setWeekLabel(e.target.value)}
                  title='Format "YYYY-MM Wn" (z. B. "2025-09 W3")'
                />
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    try {
                      const u = new URL(window.location.href);
                      u.searchParams.set("weekLabel", weekLabel);
                      window.history.replaceState({}, "", u.toString());
                    } catch { }
                  }}
                >
                  Übernehmen
                </Button>
              </div>
              <WeeklyTradingReflection userId={userId} label={weekLabel} />
            </CardContent>
          </Card>

          <Card className="w-full max-w-full overflow-hidden">
            <CardHeader>
              <CardTitle>History (Week → Month → Quarter)</CardTitle>
            </CardHeader>
            <CardContent className="min-w-0">
              <TradingHistory userId={userId} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Komponenten */}
        <TabsContent value="components" className="min-w-0 w-full max-w-full">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 min-w-0">
            <RecapAccordion />
            <TradeEntryFAB userId={userId} />
            <WeeklyStatsCard userId={userId} />
            <div className="lg:col-span-2 min-w-0 w-full max-w-full overflow-hidden">
              <WishGainVsReality />
            </div>
          </div>
        </TabsContent>

        {/* Accounts */}
        <TabsContent value="accounts" className="min-w-0 w-full max-w-full">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-3 min-w-0">
            <h2 className="text-lg font-semibold">Accounts verwalten</h2>
            <AddAccountModal userId={userId} />
          </div>
          <AccountManager userId={userId} />
        </TabsContent>

        {/* ⚙️ NEU: Settings / Anpassungen */}
        <TabsContent value="settings" className="min-w-0 w/full max-w-full">
          <Card className="w/full max-w-full overflow-hidden">
            <CardHeader>
              <CardTitle>Anpassungen – Metriken</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-sm text-muted-foreground">
                Lege fest, aus welchem Zeitraum die **Trading-Metriken** berechnet werden. Diese Auswahl wirkt global auf die Kacheln im Header (und kann später auch für weitere Widgets übernommen werden).
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  variant={metricsRange === "week" ? "default" : "outline"}
                  onClick={() => setMetricsRange("week")}
                  title="Letzte 7 Tage"
                  size="sm"
                  className="whitespace-nowrap"
                >
                  Letzte 7 Tage
                </Button>
                <Button
                  variant={metricsRange === "month" ? "default" : "outline"}
                  onClick={() => setMetricsRange("month")}
                  title="Letzte 30 Tage"
                  size="sm"
                  className="whitespace-nowrap"
                >
                  Letzter Monat (30 Tage)
                </Button>
                <Button
                  variant={metricsRange === "all" ? "default" : "outline"}
                  onClick={() => setMetricsRange("all")}
                  title="Gesamtzeitraum (All-Time)"
                  size="sm"
                  className="whitespace-nowrap"
                >
                  Gesamt (All-Time)
                </Button>
              </div>

              <div className="text-xs text-muted-foreground">
                Persistenz: URL-Parameter <code>?range={metricsRange}</code> und <code>localStorage["trading:metricsRange"]</code>.
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
