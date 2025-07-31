"use client";
import useSWR from "swr";
import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Stat, StatLabel, StatNumber } from"../ui/stat";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

interface StatsData {
  count: number;
  winrate: number;
  avgPnl: number;
  avgRating: number;
  history?: { day: string; count: number }[];
}
interface MentalData {
  performance: { A: number; B: number; C: number };
  avgDiscipline: number;
}

interface Props {
  userId: string;
}

const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function WeeklySummary({ userId }: Props) {
  const { data: stats, error: statsError } = useSWR<StatsData>(
    userId ? `/api/trades/getStats?range=week&userId=${userId}` : null,
    fetcher
  );
  const { data: mental, error: mentalError } = useSWR<MentalData>(
    userId ? `/api/trades/mentalStats?userId=${userId}` : null,
    fetcher
  );

  if (!stats || !mental || statsError || mentalError) {
    return (
      <div className="flex justify-center py-8 text-sm text-muted-foreground">
        Lade wöchentliche Daten...
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Wöchentliche Zusammenfassung</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Stat>
            <StatLabel>Trades</StatLabel>
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
            <StatLabel>Performance A/B/C</StatLabel>
            <StatNumber>
              {mental.performance.A}/{mental.performance.B}/{mental.performance.C}
            </StatNumber>
          </Stat>
          <Stat>
            <StatLabel>Ø Disziplin</StatLabel>
            <StatNumber>{Math.round(mental.avgDiscipline)}%</StatNumber>
          </Stat>
        </div>

        {stats.history && (
          <AspectRatio ratio={16 / 9} className="w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.history}>
                <XAxis dataKey="day" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </AspectRatio>
        )}
      </CardContent>
    </Card>
  );
}
