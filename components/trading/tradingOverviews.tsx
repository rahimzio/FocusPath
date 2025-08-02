"use client";

import React, { useState } from "react";
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
import { Component as WishGainVsReality } from "./charts/wishgainvsreality";

export default function TradingDashboard() {
  const { data: session } = useSession();
  const userId = session?.user?.id as string | undefined;
  const [filtersOpen, setFiltersOpen] = useState(false);

  if (!userId) return <p>Bitte einloggen...</p>;

  return (
    <div className="space-y-6 p-4">
      {/* Header & Quick Metrics */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Trading Dashboard</h1>
        <TradeMetrics userId={userId} />
      </div>

      {/* Quick Actions */}
      <div className="flex gap-2">
        <AddTradeModal userId={userId} />
        <Button variant="secondary" onClick={() => setFiltersOpen(!filtersOpen)}>
          Filter
        </Button>
        <Button variant="secondary">Strategie hinzufügen</Button>
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Übersicht</TabsTrigger>
          <TabsTrigger value="components">Komponenten</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          {/* Central Trade Recap */}
          <TradeRecapList userId={userId} />

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
                <StrategyPills userId={userId} onSelect={() => {}} />
                <MonthlyStatsOverlay userId={userId} />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="components">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <RecapAccordion />
            <TradeEntryFAB userId={userId} date={new Date().toISOString().slice(0, 10)} />
            <WeeklyStatsCard userId={userId} />
            <div className="lg:col-span-2">
              <WishGainVsReality />
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
