"use client";
import { useState } from "react";
import { useSession } from "next-auth/react";
import TradeEntryForm from "./TradeEntryForm";
import TradeListByDate from "./TradeListByDate";
import WeeklySummary from "./WeeklySummary";
import TradeStatsOverview from "./TradeStatsOverview";
import MentalStatsOverview from "./MentalStatsOverview";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";

export default function RecapPage() {
  const { data: session } = useSession();
  const userId = session?.user?.email || "";
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );
  const [open, setOpen] = useState(false);

  if (!userId) return <div>Bitte einloggen...</div>;

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-2">
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
      <TradeListByDate date={selectedDate} userId={userId} />
      <TradeStatsOverview userId={userId} />
      <WeeklySummary userId={userId} />
      <MentalStatsOverview userId={userId} />

    </div>
  );
}