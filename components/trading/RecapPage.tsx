"use client";
import React, { useState } from "react";
import { useSession } from "next-auth/react";
import useSWR from "swr";
import TradeEntryForm from "./TradeEntryForm";
import TradeListByDate from "./TradeListByDate";
import WeeklySummary from "./WeeklySummary";
import TradeStatsOverview from "./TradeStatsOverview";
import MentalStatsOverview from "./MentalStatsOverview";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function RecapPage() {
  const { data: session } = useSession();
  const userId = session?.user?.email || "";
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );
  const [open, setOpen] = useState(false);

  // Optional: Monthly PnL Trend
  const { data: monthlyPnl } = useSWR<{ day: string; cumPnl: number }[]>(
    userId ? `/api/trades/monthlyPnl?userId=${userId}` : null,
    fetcher
  );

  if (!userId) return <div>Bitte einloggen...</div>;

  return (
    <div className="p-4 space-y-4">
      {/* Datumsauswahl & Trade-Eingabe */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:gap-4 gap-2">
        <Input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="max-w-[200px]"
        />
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button>{open ? "Schließen" : "Trade hinzufügen"}</Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="sm:max-w-lg">
            <TradeEntryForm
              date={selectedDate}
              userId={userId}
              onCreated={() => setOpen(false)}
            />
          </SheetContent>
        </Sheet>
      </div>

      {/* Optional: Monats-PnL-Trend */}
      {monthlyPnl && (
        <AspectRatio ratio={16 / 9} className="mb-4">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={monthlyPnl}>
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip />
              <Line dataKey="cumPnl" stroke="#3b82f6" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </AspectRatio>
      )}

      {/* Trade-Liste */}
      <Card>
        <CardHeader>
          <CardTitle>Trades am {selectedDate}</CardTitle>
        </CardHeader>
        <CardContent>
          <TradeListByDate date={selectedDate} userId={userId} />
        </CardContent>
      </Card>

      {/* Statistiken */}
      <Card>
        <CardHeader>
          <CardTitle>Statistiken</CardTitle>
        </CardHeader>
        <CardContent>
          <TradeStatsOverview userId={userId} />
        </CardContent>
      </Card>

      {/* Wöchentliche Zusammenfassung */}
      <Card>
        <CardHeader>
          <CardTitle>Wöchentliche Zusammenfassung</CardTitle>
        </CardHeader>
        <CardContent>
          <WeeklySummary userId={userId} />
        </CardContent>
      </Card>

      {/* Mental-Stats */}
      <MentalStatsOverview userId={userId} />
    </div>
  );
}
