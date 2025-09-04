"use client";

import React, { useState, useEffect } from "react";
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

// ✅ Neu importieren
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
        <Card>
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
        <Card>
          <CardHeader><CardTitle>Game Distribution</CardTitle></CardHeader>
          <CardContent className="text-sm opacity-70">
            Die Game-Distribution-Komponente ist noch nicht verfügbar.
          </CardContent>
        </Card>
      );
    };
  }
}, { ssr: false, loading: () => <div className="opacity-70">Lade…</div> });

// ✅ GameLibrary (A/B/C-Definitionen erfassen/bearbeiten)
const GameLibrary = dynamic<{ userId: string }>(
  async () => {
    try {
      const mod = await import("./GameLibrary");
      return (mod as any).default ?? (() => null);
    } catch {
      return function Fallback() {
        return (
          <Card>
            <CardHeader><CardTitle>Game Library</CardTitle></CardHeader>
            <CardContent className="text-sm opacity-70">
              Die GameLibrary-Komponente ist noch nicht verfügbar.
            </CardContent>
          </Card>
        );
      };
    }
  }, { ssr: false, loading: () => <div className="opacity-70">Lade…</div> });

// ✅ GamePicker (heutiges A/B/C wählen)
const GamePicker = dynamic<{ userId: string }>(
  async () => {
    try {
      const mod = await import("./GamePicker");
      return (mod as any).default ?? (() => null);
    } catch {
      return function Fallback() {
        return (
          <Card>
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


export default function TradingDashboard() {
  const { data: session } = useSession();
  const userId = session?.user?.id as string | undefined;
  const [filtersOpen, setFiltersOpen] = useState(false);

  // 🔹 Aktiven Tab steuern (damit wir per Button/URL direkt zum Game-Tab springen können)
  const [tab, setTab] = useState<"overview" | "game" | "components" | "accounts">("overview");

  // Optional: ?tab=game in URL öffnet direkt den Game-Tab
  useEffect(() => {
    try {
      const url = new URL(window.location.href);
      const t = url.searchParams.get("tab");
      if (t === "game" || t === "components" || t === "accounts" || t === "overview") {
        setTab(t as any);
      }
    } catch { }
  }, []);

  if (!userId) return <p>Bitte einloggen...</p>;

  return (
    <div className="space-y-6 p-4">
      {/* Header & Quick Metrics */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Trading Dashboard</h1>
        <TradeMetrics userId={userId} />
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-2">
        <AddTradeModal userId={userId} />
        <Button variant="secondary" onClick={() => setFiltersOpen(!filtersOpen)}>Filter</Button>
        <AddStrategyModal userId={userId} />
        <AddAccountModal userId={userId} />
        {/* 🔹 Quick-Access zum Game-Tab */}
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
        >
          A/B/C Game setzen
        </Button>
      </div>

      {/* Main Tabs */}
      <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Übersicht</TabsTrigger>
          <TabsTrigger value="game">Game</TabsTrigger>
          <TabsTrigger value="components">Komponenten</TabsTrigger>
          <TabsTrigger value="accounts">Accounts</TabsTrigger>
        </TabsList>

        {/* -------- Übersicht -------- */}
        <TabsContent value="overview">
          {/* Schnellzugriff: Heutiges Game wählen */}
          <Card className="mb-4">
            <CardHeader>
              <CardTitle>Heutiges Game wählen</CardTitle>
            </CardHeader>
            <CardContent>
              {/* GamePicker postet intern ein CustomEvent "game-pick".
                  TEF kann darauf hören oder du nutzt die Auswahl einfach als Kontext im Dashboard. */}
              <GamePicker userId={userId} />
            </CardContent>
          </Card>

          {/* Central Trade Recap */}
          <TradeRecapList userId={userId} />
          <GameDistributionCard />

          {/* Charts & Reflection Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Performance Chart</CardTitle>
              </CardHeader>
              <CardContent>
                <PerformanceChart userId={userId} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Fehler & Reflexion</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 gap-4">
                <MistakePatternChart userId={userId} />
                <TradeReflection userId={userId} />
              </CardContent>
            </Card>

            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Strategien & Monatliche Stats</CardTitle>
              </CardHeader>
              <CardContent>
                <StrategyPills userId={userId} />
                <MonthlyStatsOverlay userId={userId} />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* -------- Game (A/B/C Library + Auswahl) -------- */}
        <TabsContent value="game">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card id="game-library">
              <CardHeader>
                <CardTitle>Game Library (A/B/C definieren)</CardTitle>
              </CardHeader>
              <CardContent>
                {/* Hier pflegst du deine Kriterien je Game */}
                <GameLibrary userId={userId} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Game Auswahl</CardTitle>
              </CardHeader>
              <CardContent>
                {/* Tages-/Session-Auswahl. Emit "game-pick" → andere Komponenten können reagieren */}
                <GamePicker userId={userId} />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* -------- Komponenten -------- */}
        <TabsContent value="components">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <RecapAccordion />
            {/* ❗ date-Prop entfernt (Typfehler fix) */}
            <TradeEntryFAB userId={userId} />
            <WeeklyStatsCard userId={userId} />
            <div className="lg:col-span-2">
              <WishGainVsReality />
            </div>
          </div>
        </TabsContent>

        {/* -------- Accounts -------- */}
        <TabsContent value="accounts">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">Accounts verwalten</h2>
            <AddAccountModal userId={userId} />
          </div>
          <AccountManager userId={userId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
