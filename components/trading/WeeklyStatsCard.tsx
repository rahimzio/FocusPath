"use client";

import React from "react";
import useSWR from "swr";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Stat, StatLabel, StatNumber } from "../ui/stat";
import { Spinner } from "../ui/spinner";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface TopPair {
  pair: string;
  win_rate: number;
}

interface WeeklyStats {
  best_pair: string;
  win_rate: number;
  pct_change: string;
  top_pairs: TopPair[];
}

interface Props {
  userId: string;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function WeeklyStatsCard({ userId }: Props) {
  const { data, error, isLoading } = useSWR<{ stats: WeeklyStats }>(
    userId ? `/api/stats/weekly?userId=${userId}` : null,
    fetcher,
    { refreshInterval: 300000 }
  );

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Spinner />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="text-center text-red-600 py-8">
        Fehler beim Laden der wöchentlichen Statistik
      </div>
    );
  }

  const { best_pair, win_rate, pct_change, top_pairs } = data.stats;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Wöchentliche Kennzahlen</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-3 gap-4">
          <Stat>
            <StatLabel>Bestes Paar</StatLabel>
            <StatNumber>{best_pair}</StatNumber>
          </Stat>
          <Stat>
            <StatLabel>Winrate</StatLabel>
            <StatNumber>{Math.round(win_rate * 100)}%</StatNumber>
          </Stat>
          <Stat>
            <StatLabel>Veränderung</StatLabel>
            <StatNumber>{pct_change}</StatNumber>
          </Stat>
        </div>

        <div className="space-y-2">
          <div className="text-sm font-medium">Top Pairs</div>
          <AspectRatio ratio={16 / 9} className="w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={top_pairs.map((p) => ({ pair: p.pair, win_rate: Math.round(p.win_rate * 100) }))}
              >
                <XAxis dataKey="pair" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="win_rate" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </AspectRatio>
        </div>
      </CardContent>
    </Card>
  );
}
