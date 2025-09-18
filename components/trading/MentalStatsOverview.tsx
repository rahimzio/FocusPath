"use client";
import React from "react";
import useSWR from "swr";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Stat, StatLabel, StatNumber } from "../ui/stat";
import { Spinner } from "../ui/spinner";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

interface Props {
  userId: string;
}

const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function MentalStatsOverview({ userId }: Props) {
  const { data, error, isLoading } = useSWR<{
    performance: Record<string, number>;
    avgDiscipline: number;
    tiltCount: number;
    mistakes: { name: string; count: number }[];
  }>(
    userId ? `/api/trading/mentalStats?userId=${userId}` : null,
    fetcher
  );

  if (isLoading) {
    return (
      <div className="flex justify-center py-8 w-full">
        <Spinner />
      </div>
    );
  }
  if (error) {
    return <div className="text-red-600 text-center py-4">Fehler beim Laden der Mental-Stats</div>;
  }
  if (!data) {
    return (
      <div className="flex justify-center py-8 w-full">
        <Spinner />
      </div>
    );
  }

  const perfData = Object.entries(data.performance || {}).map(([name, value]) => ({ name, value }));

  return (
    <Card className="w-full max-w-full min-w-0 overflow-hidden">
      <CardHeader className="w-full max-w-full min-w-0">
        <CardTitle className="truncate">Mental-Stats</CardTitle>
      </CardHeader>

      <CardContent className="space-y-4 w-full max-w-full min-w-0">
        {/* Performance Bar Chart */}
        <AspectRatio ratio={16 / 9} className="w-full max-w-full min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={perfData}
              margin={{ top: 8, right: 16, left: 8, bottom: 8 }}
            >
              <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
              <XAxis
                dataKey="name"
                minTickGap={10}
                tickMargin={8}
                tick={{ fontSize: 12 }}
                interval="preserveEnd"
              />
              <YAxis allowDecimals={false} width={34} tick={{ fontSize: 12 }} />
              <Tooltip wrapperStyle={{ outline: "none" }} />
              <Bar dataKey="value" fill="#6366F1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </AspectRatio>

        {/* Key Stats */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 w-full max-w-full min-w-0">
          <Stat className="min-w-0">
            <StatLabel className="truncate">Ø Disziplin</StatLabel>
            <StatNumber className="truncate">{Math.round(data.avgDiscipline)}</StatNumber>
          </Stat>
          <Stat className="min-w-0">
            <StatLabel className="truncate">Tilt Events</StatLabel>
            <StatNumber className="truncate">{data.tiltCount}</StatNumber>
          </Stat>
        </div>

        {/* Mistakes List */}
        <div className="w-full max-w-full min-w-0">
          <div className="text-sm font-medium mb-2">Häufige Fehler</div>
          <div className="max-h-48 overflow-y-auto pr-1">
            <ul className="list-disc pl-5 space-y-1">
              {(data.mistakes ?? []).map(m => (
                <li key={m.name} className="text-sm break-words">
                  <span className="font-medium">{m.name}</span>: {m.count}
                </li>
              ))}
              {(data.mistakes ?? []).length === 0 && (
                <li className="text-sm opacity-70">Keine Fehler erfasst.</li>
              )}
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
