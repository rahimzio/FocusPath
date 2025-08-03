"use client";
import useSWR from "swr";
import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Stat, StatLabel, StatNumber } from "../ui/stat";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";

interface Props {
  userId: string;
  range?: "week" | "month";
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function TradeStatsOverview({ userId, range = "week" }: Props) {
  // Lade Trading-Stats
  const { data: stats } = useSWR(
    userId ? `/api/trading/getStats?range=${range}&userId=${userId}` : null,
    fetcher
  );
  // Lade mentale Stats (Disziplin, Tilt)
  const { data: mental } = useSWR(
    userId ? `/api/trading/mentalStats?userId=${userId}` : null,
    fetcher
  );

  if (!stats || !mental) {
    return <div className="flex justify-center p-8">Lade Statistik...</div>;
  }

  // Beispielhafte PnL-Historie für Chart
  const pnlHistory = stats.pnlHistory || stats.history || [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Statistiken ({range === "week" ? "Woche" : "Monat"})</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Statistische Übersicht */}
        <div className="grid grid-cols-2 gap-4">
          <Stat>
            <StatLabel>Anzahl Trades</StatLabel>
            <StatNumber>{stats.count}</StatNumber>
          </Stat>
          <Stat>
            <StatLabel>Winrate</StatLabel>
            <StatNumber>{Math.round(stats.winrate * 100)}%</StatNumber>
          </Stat>
          <Stat>
            <StatLabel>Ø PnL</StatLabel>
            <StatNumber>{stats.avgPnl.toFixed(2)}€</StatNumber>
          </Stat>
          <Stat>
            <StatLabel>Ø Rating</StatLabel>
            <StatNumber>{stats.avgRating.toFixed(1)}</StatNumber>
          </Stat>
          <Stat>
            <StatLabel>Ø Disziplin</StatLabel>
            <StatNumber>{Math.round(mental.avgDiscipline)}%</StatNumber>
          </Stat>
          <Stat>
            <StatLabel>Tilt Events</StatLabel>
            <StatNumber>{mental.tiltCount}</StatNumber>
          </Stat>
        </div>

        {/* PnL-Verlauf */}
        <AspectRatio ratio={16 / 9} className="w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={pnlHistory} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="pnlGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.6} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Area
                type="monotone"
                dataKey="pnl"
                stroke="#3b82f6"
                fillOpacity={1}
                fill="url(#pnlGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </AspectRatio>
      </CardContent>
    </Card>
  );
}
