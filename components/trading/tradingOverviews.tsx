"use client";
import React from "react";
import AccountOverviewCard from "./AccountOverviewCard";
import MistakePatternChart from "./MistakePatternChart";
import MonthlyStatsOverlay from "./MonthlyStatsOverlay";
import RecapAccordion from "./RecapAccordion";
import ReflectionPanel from "./ReflectionPanel";
import StrategyPills from "./StrategyPills";
import TradeEntryFAB from "./TradeEntryFAB";
import WeeklyStatsCard from "./WeeklyStatsCard";
import { Component as PerformanceChart } from "./charts/performance";
import { Component as WishGainVsReality } from "./charts/wishgainvsreality";

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Stat, StatLabel, StatNumber } from "../ui/stat";
import { AspectRatio } from "@/components/ui/aspect-ratio";

const TradingOverview = () => {
  const userId = "demo-user-id";
  const today = new Date().toISOString().slice(0, 10);

  // Dummy-Trade für ReflectionPanel
  const dummyTrade = {
    userId,
    date: today,
    symbol: "BTCUSD",
    setup: "Demo-Setup",
    entry: 0,
    exit: 0,
    stopLoss: 0,
    positionSize: 1,
    result: "win" as "win" | "loss" | "BE",
    pnl: 0,
    rating: 1,
  };

  // Beispiel Quick-Stats
  const quickStats = {
    spread: 0.5,
    volume: 120,
  };

  return (
    <div className="space-y-6 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Trading Dashboard</h1>
        <div className="flex gap-4">
          <Stat>
            <StatLabel>Spread</StatLabel>
            <StatNumber>{quickStats.spread}%</StatNumber>
          </Stat>
          <Stat>
            <StatLabel>Volumen</StatLabel>
            <StatNumber>{quickStats.volume}k</StatNumber>
          </Stat>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Übersicht</TabsTrigger>
          <TabsTrigger value="components">Komponenten</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <Card>
            <CardHeader>
              <CardTitle>Account & Performance</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <AccountOverviewCard
                balance={10000}
                equityCurve={[{ date: today, value: 10000 }]}
                usedMargin={2000}
                availableMargin={8000}
              />
              <AspectRatio ratio={16 / 9} className="w-full">
                <PerformanceChart />
              </AspectRatio>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Fehler & Reflexion</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <MistakePatternChart userId={userId} />
              <ReflectionPanel
                trade={dummyTrade}
                onSaved={() => console.log("Reflexion gespeichert")}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Strategien & Monatliche Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <StrategyPills userId={userId} onSelect={(id) => console.log(id)} />
              <MonthlyStatsOverlay userId={userId} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="components">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <RecapAccordion />
            <TradeEntryFAB userId={userId} date={today} />
            <WeeklyStatsCard userId={userId} />
            <AspectRatio ratio={16 / 9} className="w-full">
              <WishGainVsReality />
            </AspectRatio>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default TradingOverview;
