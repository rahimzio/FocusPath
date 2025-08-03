"use client";
import React from "react";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Spinner } from "../ui/spinner";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  LineChart,
  Line,
  Tooltip,
} from "recharts";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Stat, StatLabel, StatNumber } from "../ui/stat";

interface Props {
  userId: string;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function MonthlyStatsOverlay({ userId }: Props) {
  const { data, error, isLoading } = useSWR<{
    months: { month: string; pnl: number; cumulative: number }[];
    maxDrawdown: number;
    avgRiskReward: number;
  }>(userId ? `/api/trading/monthly/${userId}` : null, fetcher);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">Letzte Monate Stats</Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Monatliche Statistiken</DialogTitle>
          <DialogDescription>Übersicht der letzten Monate</DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Spinner />
          </div>
        ) : error ? (
          <div className="text-red-600 text-center py-4">Fehler beim Laden der Daten</div>
        ) : (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Monatliches PnL</CardTitle>
              </CardHeader>
              <CardContent>
                <AspectRatio ratio={4 / 1} className="w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data!.months}>
                      <XAxis dataKey="month" />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Bar dataKey="pnl" fill="#3b82f6" />
                    </BarChart>
                  </ResponsiveContainer>
                </AspectRatio>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Kumulative Entwicklung</CardTitle>
              </CardHeader>
              <CardContent>
                <AspectRatio ratio={4 / 1} className="w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data!.months}>
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Line type="monotone" dataKey="cumulative" stroke="#10b981" dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </AspectRatio>
              </CardContent>
            </Card>

            <div className="grid grid-cols-2 gap-4">
              <Stat>
                <StatLabel>Max Drawdown</StatLabel>
                <StatNumber>{data!.maxDrawdown.toFixed(2)}</StatNumber>
              </Stat>
              <Stat>
                <StatLabel>Ø Risk/Reward</StatLabel>
                <StatNumber>{data!.avgRiskReward.toFixed(2)}</StatNumber>
              </Stat>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="secondary">Schließen</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
