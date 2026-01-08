"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

// Dein existierendes Setup-Board
import TradingSetupsDashboard from "./setups/TradingSetupsDashboard";

// Trades-Board (mit TradeEntryForm & Trade-Liste)
import TradesBoard from "./trades/TradesBoard";

import { TradingAnalyticsDashboard } from "./analytics/TradingAnalyticsDashboard";
import IccWeeklyReview from "./trades/IccWeeklyReview";
import IccManagementStatsCard from "./icc/IccManagementStatsCard";
import TradeDayReflection from "./trades/TradeDayReflection";
import WeeklyTradingReflection from "./review/WeeklyTradingReflection";
import WeeklyTradingReflectionPicker from "./review/WeeklyTradingReflectionPicker";
import ImproveAtAGlance from "./improve/ImproveAtAGlance";
import GameLibrary from "./GameLibrary";
import GameDistributionCard from "../trading/GameDistributionCard";

// optional später im Tab:
// import GamePicker from "./game/GamePicker";

interface TradingDashboardProps {
  userId: string;
  className?: string;
}

/** ✅ NEW: berechnet dein Weekly-Label Format: "YYYY-MM W1..W4" */
function getWeeklyLabelForDate(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = d.getDate();

  const segment = day <= 7 ? "W1" : day <= 14 ? "W2" : day <= 21 ? "W3" : "W4";
  return `${y}-${m} ${segment}`;
}

/**
 * Übergeordnetes Trading-Dashboard (TradeZella-Style)
 * - Tab "Overview": High-Level Ansicht / KPIs / Quicklinks + Day Reflection
 * - Tab "Setups": Setup-Board
 * - Tab "Trades": Trade Journal
 * - Tab "Improve": Improve overview (API)
 * - Tab "Game": A/B/C Library pflegen
 * - Tab "Groups": später Strategien / Trade-Gruppen
 * - Tab "Analytics": Performance-Auswertung
 */
export const TradingDashboard: React.FC<TradingDashboardProps> = ({ userId, className }) => {
  const [activeTab, setActiveTab] = React.useState<
    "overview" | "setups" | "trades" | "improve" | "game" | "groups" | "analytics"
  >("overview");

  // ✅ NEW: Default weekly label = aktuelle Woche im Monats-Segment-System (W1..W4)
  const [weeklyLabel, setWeeklyLabel] = React.useState<string>(() => getWeeklyLabelForDate(new Date()));

  // ✅ FIX: onJump implementieren (statt Error werfen)
  function onJump(target: "progress" | "planner" | "drillboard" | "improvement-planner"): void {
    // In deinem Dashboard gibt es aktuell nur einen Improve-Tab.
    // Planner/Progress/Drillboard sind Unterseiten/Blöcke – fürs Erste routen wir alles nach Improve.
    // Später können wir Improve intern noch in SubTabs splitten.
    if (target === "progress") {
      // wenn du später einen eigenen Progress-Tab willst: setActiveTab("progress")
      setActiveTab("improve");
      return;
    }
    if (target === "planner") {
      setActiveTab("improve");
      return;
    }
    if (target === "drillboard") {
      setActiveTab("improve");
      return;
    }
    if (target === "improvement-planner") {
      setActiveTab("improve");
      return;
    }
  }

  return (
    <div className={cn("flex flex-col gap-4 px-4 pb-6 md:px-6", className)}>
      {/* Top-Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Trading Dashboard</h1>
          <p className="text-xs text-muted-foreground">
            Dein Kontrollzentrum für Setups, Trades, Strategien & Performance – angelehnt an TradeZella, aber in FocusPath
            integriert.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Quick Action → springt in Trades */}
          <Button variant="outline" size="sm" onClick={() => setActiveTab("trades")}>
            📓 Trade loggen
          </Button>
          <Badge variant="outline" className="text-[10px] uppercase">
            V2 · Alpha
          </Badge>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="space-y-4">
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="setups">Setups</TabsTrigger>
          <TabsTrigger value="trades">Trades</TabsTrigger>

          {/* ✅ FIX: Improve existiert jetzt wirklich im Type */}
          <TabsTrigger value="improve">Improve</TabsTrigger>

          {/* ✅ NEW: Game Tab */}
          <TabsTrigger value="game">Game</TabsTrigger>

          <TabsTrigger value="groups">Strategien / Groups</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* OVERVIEW TAB */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Heute / Diese Woche</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-xs text-muted-foreground">
                <p>
                  📌 Geplante Setups heute: <span className="font-semibold">–</span>
                </p>
                <p>
                  ✅ Ausgeführte Trades heute: <span className="font-semibold">–</span>
                </p>
                <p>
                  🎯 Heutiges Fokus-Thema: <span className="font-semibold">Execution</span>
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Performance Snapshot</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-xs text-muted-foreground">
                <p>
                  Winrate (letzte 30 Trades): <span className="font-semibold">– %</span>
                </p>
                <p>
                  Ø R-Multiple: <span className="font-semibold">– R</span>
                </p>
                <p>
                  Best Strategy: <span className="font-semibold">–</span>
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Mental Game / Discipline</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-xs text-muted-foreground">
                <p>
                  A-Game Quote (letzte 20 Trades): <span className="font-semibold">– %</span>
                </p>
                <p>
                  Regelbrüche: <span className="font-semibold">–</span>
                </p>
                <p>
                  Nächster Fokus: <span className="font-semibold">Kein Overtrading</span>
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Quicklinks</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2 text-xs">
              <Button size="sm" variant={activeTab === "setups" ? "default" : "outline"} onClick={() => setActiveTab("setups")}>
                🧱 Zu den Setups
              </Button>
              <Button size="sm" variant={activeTab === "trades" ? "default" : "outline"} onClick={() => setActiveTab("trades")}>
                📓 Trade-Journal
              </Button>
              <Button size="sm" variant={activeTab === "improve" ? "default" : "outline"} onClick={() => setActiveTab("improve")}>
                🧠 Improve
              </Button>
              <Button size="sm" variant={activeTab === "game" ? "default" : "outline"} onClick={() => setActiveTab("game")}>
                🎮 Game
              </Button>
              <Button size="sm" variant={activeTab === "groups" ? "default" : "outline"} onClick={() => setActiveTab("groups")}>
                🧬 Strategien / Groups
              </Button>
              <Button size="sm" variant={activeTab === "analytics" ? "default" : "outline"} onClick={() => setActiveTab("analytics")}>
                📊 Analytics
              </Button>
            </CardContent>
          </Card>

          {/* Daily: Day Reflection */}
          <TradeDayReflection userId={userId} />
        </TabsContent>

        {/* SETUPS TAB */}
        <TabsContent value="setups">
          <TradingSetupsDashboard userId={userId} />
        </TabsContent>

        {/* TRADES TAB */}
        <TabsContent value="trades" className="space-y-4">
          <TradesBoard userId={userId} />
        </TabsContent>

        {/* ✅ IMPROVE TAB */}
        <TabsContent value="improve" className="space-y-4">
          <ImproveAtAGlance userId={userId} onJump={onJump} />
          {/* Später: Planner/Progress/Drillboard hier drunter einbauen */}
        </TabsContent>

        {/* ✅ NEW: GAME TAB */}
        <TabsContent value="game" className="space-y-4">
          <GameLibrary userId={userId} />
          <GameDistributionCard userId={userId} />
          {/* optional später: GamePicker direkt hier */}
        </TabsContent>

        {/* GROUPS TAB */}
        <TabsContent value="groups" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Strategien & Trade-Gruppen</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground space-y-2">
              <p>
                Hier wirst du später deine <span className="font-semibold">Trade-Gruppen / Strategien</span> verwalten:
              </p>
              <ul className="list-disc pl-4 space-y-1">
                <li>Group-Definition (z.B. "NAS100 London Breakout")</li>
                <li>Farbe, Beschreibung, Aktiv/Archiviert</li>
                <li>Verknüpfung zu Trades für Strategy-Stats</li>
              </ul>
              <p>
                Die Struktur dafür liegt schon in <code>TradeGroup</code>.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ANALYTICS TAB */}
        <TabsContent value="analytics" className="space-y-4">
          <TradingAnalyticsDashboard userId={userId} />

          <IccWeeklyReview userId={userId} className="mt-8" />

          {/* ✅ NEW: Weekly label control (optional, small) */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="text-xs text-muted-foreground">
              Weekly Segment Label:
              <span className="font-mono ml-2">{weeklyLabel}</span>
            </div>
            <Button size="sm" variant="outline" onClick={() => setWeeklyLabel(getWeeklyLabelForDate(new Date()))}>
              Aktuelle Woche setzen
            </Button>
          </div>

          {/* ✅ FIX: label muss "YYYY-MM W1..W4" sein */}
          <WeeklyTradingReflection userId={userId} label={weeklyLabel} />
          <WeeklyTradingReflectionPicker userId={userId} />

          {/* TODO: später echte trades reingeben */}
          <IccManagementStatsCard trades={[]} className="mt-4" />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default TradingDashboard;
