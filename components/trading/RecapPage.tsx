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
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function RecapPage() {
  const { data: session } = useSession();
  const userId =
    (session?.user?.id as string | undefined) ||
    (session?.user?.email as string | undefined) ||
    "";

  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );
  const [open, setOpen] = useState(false);

  // Optional: Monthly PnL Trend
  const { data: monthlyPnl } = useSWR<{ day: string; cumPnl: number }[]>(
    userId ? `/api/trading/monthlyPnl?userId=${encodeURIComponent(userId)}` : null,
    fetcher
  );

  if (!userId) return <div className="px-4">Bitte einloggen...</div>;

  return (
    <div className="mx-auto w-full max-w-screen-lg px-3 sm:px-4 space-y-6 min-w-0">
      {/* Datumsauswahl & Trade-Eingabe */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 min-w-0">
        <div className="min-w-0">
          <Input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="max-w-[200px]"
          />
        </div>

        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button className="w-full sm:w-auto">
              {open ? "Schließen" : "Trade hinzufügen"}
            </Button>
          </SheetTrigger>
          {/* mobil: volle Breite; auf größeren Screens schmal */}
          <SheetContent side="bottom" className="w-full sm:max-w-lg mx-auto">
            <TradeEntryForm
              date={selectedDate}
              userId={userId}
              onCreated={() => setOpen(false)}
            />
          </SheetContent>
        </Sheet>
      </div>

      {/* Optional: Monats-PnL-Trend */}
      {Array.isArray(monthlyPnl) && monthlyPnl.length > 0 && (
        <div className="w-full max-w-full min-w-0">
          <AspectRatio ratio={16 / 9} className="w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyPnl} margin={{ top: 10, right: 20, left: 10, bottom: 10 }}>
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip />
                <Line dataKey="cumPnl" stroke="#3b82f6" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </AspectRatio>
        </div>
      )}

      {/* Trade-Liste */}
      <Card className="w-full max-w-full min-w-0 overflow-hidden">
        <CardHeader className="w-full max-w-full min-w-0">
          <CardTitle className="truncate">Trades am {selectedDate}</CardTitle>
        </CardHeader>
        <CardContent className="w-full max-w-full min-w-0">
          <TradeListByDate date={selectedDate} userId={userId} />
        </CardContent>
      </Card>

      {/* Statistiken */}
      <Card className="w-full max-w-full min-w-0 overflow-hidden">
        <CardHeader>
          <CardTitle className="truncate">Statistiken</CardTitle>
        </CardHeader>
        <CardContent className="w-full max-w-full min-w-0">
          <TradeStatsOverview userId={userId} />
        </CardContent>
      </Card>

      {/* Wöchentliche Zusammenfassung */}
      <Card className="w-full max-w-full min-w-0 overflow-hidden">
        <CardHeader>
          <CardTitle className="truncate">Wöchentliche Zusammenfassung</CardTitle>
        </CardHeader>
        <CardContent className="w-full max-w-full min-w-0">
          <WeeklySummary userId={userId} />
        </CardContent>
      </Card>

      {/* Mental-Stats */}
      <div className="w-full max-w-full min-w-0">
        <MentalStatsOverview userId={userId} />
      </div>
    </div>
  );
}
