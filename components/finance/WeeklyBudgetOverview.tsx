"use client";
import { useEffect, useState } from "react";
import { BudgetEntry } from "@/utils/interface";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "../ui/badge";
function getWeekString(date: Date) {
  const firstDay = new Date(date.getFullYear(), 0, 1);
  const pastDays = Math.floor((+date - +firstDay) / 86400000);
  const week = Math.ceil((pastDays + firstDay.getDay() + 1) / 7);
  return `${date.getFullYear()}-${String(week).padStart(2, "0")}`;
}

export default function WeeklyBudgetOverview() {
  const { data: session } = useSession();
  const [entry, setEntry] = useState<BudgetEntry | null>(null);

  const userId = (session as any)?.user?.id as string | undefined;
  const week = getWeekString(new Date());

  async function load() {
    if (!userId) return;
    const res = await fetch(`/api/finance/getWeeklyBudget?userId=${userId}&week=${week}`);
    const data = await res.json();
    setEntry(data.budget);
  }

  useEffect(() => { load(); }, [userId]);

  if (!userId) return null;
  if (!entry) return <p>Kein Budget gesetzt.</p>;

  const percent = entry.budget ? Math.min(100, (entry.spent / entry.budget) * 100) : 0;
  const warning = percent > 80;
  const rating = entry.rating ? `Bewertung: ${entry.rating}` : undefined;

  return (
        <Card>
      <CardHeader>
        <CardTitle>Budget Woche {week}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="font-medium">Verbrauch</span>
          <span>{entry.spent} / {entry.budget} €</span>
        </div>
        <Progress value={percent} />
        <ul className="text-sm space-y-1">
          {entry.categories.map((c) => (
            <li key={c.name} className="flex justify-between">
              <span>{c.name}</span>
              <Badge variant="secondary">{c.amount} €</Badge>
            </li>
          ))}
        </ul>
        {rating && <p className="text-sm">{rating}</p>}
        {warning && (
          <p className="text-destructive text-sm">
            Achtung: mehr als 80% des Budgets verbraucht!
          </p>
        )}
      </CardContent>
    </Card>
  );
}