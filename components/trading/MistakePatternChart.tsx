"use client";
import React from "react";
import useSWR from "swr";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Spinner } from "../ui/spinner";
import { Stat, StatLabel, StatNumber } from "../ui/stat";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

interface Props {
  userId: string;
}

interface MistakeData {
  mistake_type: string;
  count: number;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const COLORS = ["#8884d8", "#82ca9d", "#ffc658", "#ff8042", "#8dd1e1"];

export default function MistakePatternChart({ userId }: Props) {
  const { data, error } = useSWR<{ mistakes: MistakeData[] }>(
    userId ? `/api/trading/mistakes/${userId}` : null,
    fetcher
  );

  if (!data && !error) {
    return (
      <div className="flex justify-center py-8">
        <Spinner />
      </div>
    );
  }

  if (error || !data || !Array.isArray(data.mistakes)) {
    return (
      <div className="text-center text-red-600 py-4">
        Stats aktuell nicht verfügbar
      </div>
    );
  }

  const chartData = data.mistakes.map((m) => ({
    name: m.mistake_type,
    value: m.count,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Fehler-Muster</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Kreisdiagramm der Fehlerverteilung */}
        <AspectRatio ratio={1} className="w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                dataKey="value"
                nameKey="name"
                innerRadius={20}
                outerRadius={50}
                label
              >
                {chartData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </AspectRatio>

        {/* Top-Fehler als Stat-Komponenten */}
        <div className="grid grid-cols-1 gap-2">
          {chartData
            .sort((a, b) => b.value - a.value)
            .slice(0, 5)
            .map((m) => (
              <Stat key={m.name}>
                <StatLabel>{m.name}</StatLabel>
                <StatNumber>{m.value}</StatNumber>
              </Stat>
            ))}
        </div>
      </CardContent>
    </Card>
  );
}
