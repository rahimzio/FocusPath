"use client";

import React, { useState, useCallback } from "react";
import useSWR from "swr";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";

const fetcher = (url: string) => fetch(url).then((r) => r.json());
const COLORS = ["#10b981", "#f59e0b", "#ef4444"];

export default function GameDistributionCard({ userId }: { userId: string }) {
  const [range, setRange] = useState<"week" | "month" | "all">("week");
  const { data, error, isLoading } = useSWR<
    { total: number; counts: { A: number; B: number; C: number } }
  >(userId ? `/api/trading/gameStats?userId=${userId}&range=${range}` : null, fetcher);

  const chartData = [
    { name: "A", value: data?.counts?.A ?? 0 },
    { name: "B", value: data?.counts?.B ?? 0 },
    { name: "C", value: data?.counts?.C ?? 0 },
  ];

  const setUrlGrade = useCallback((grade: "A" | "B" | "C") => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    url.searchParams.set("grade", grade);
    window.history.pushState({}, "", url.toString());
    // Custom Event für Recap-Liste
    window.dispatchEvent(new CustomEvent("game-grade-change", { detail: { grade } }));
  }, []);

  return (
    <Card>
      <CardHeader className="flex items-center justify-between gap-2">
        <CardTitle>A/B/C Verteilung</CardTitle>
        <div className="flex gap-1">
          {(["week", "month", "all"] as const).map((r) => (
            <Button
              key={r}
              size="sm"
              variant={range === r ? "default" : "secondary"}
              onClick={() => setRange(r)}
            >
              {r === "week" ? "7T" : r === "month" ? "30T" : "All"}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="h-48">
          {error && <div className="text-red-600">Fehler beim Laden.</div>}
          {isLoading && <div className="opacity-70">Lade…</div>}
          {!isLoading && data && (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  dataKey="value"
                  innerRadius={40}
                  outerRadius={60}
                  label
                  onClick={(d: any) => {
                    const g = d?.name as "A" | "B" | "C" | undefined;
                    if (g) setUrlGrade(g);
                  }}
                >
                  {chartData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="flex flex-col gap-2 justify-center">
          <div className="flex items-center gap-2">
            <Badge className="bg-emerald-600 text-white">A</Badge>
            <span>{data?.counts?.A ?? 0}</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="bg-amber-600 text-white">B</Badge>
            <span>{data?.counts?.B ?? 0}</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="bg-rose-600 text-white">C</Badge>
            <span>{data?.counts?.C ?? 0}</span>
          </div>
          <div className="mt-2 text-sm opacity-70">
            Total: {(data?.counts?.A ?? 0) + (data?.counts?.B ?? 0) + (data?.counts?.C ?? 0)}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
