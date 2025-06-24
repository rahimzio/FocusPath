"use client";
import { useEffect, useState } from "react";
import { BudgetEntry } from "@/utils/interface";
import { useSession } from "next-auth/react";

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

  return (
    <div className="border p-4 rounded space-y-2">
      <div className="flex justify-between">
        <span>Budget Woche {week}</span>
        <span>{entry.spent} / {entry.budget} €</span>
      </div>
      <div className="w-full bg-gray-200 rounded h-2 overflow-hidden">
        <div className={`h-2 ${warning ? 'bg-red-500' : 'bg-green-500'}`} style={{width: `${percent}%`}} />
      </div>
      <ul className="text-sm space-y-1">
        {entry.categories.map((c) => (
          <li key={c.name} className="flex justify-between">
            <span>{c.name}</span>
            <span>{c.amount} €</span>
          </li>
        ))}
      </ul>
      {warning && <p className="text-red-600 text-sm">Achtung: mehr als 80% des Budgets verbraucht!</p>}
    </div>
  );
}