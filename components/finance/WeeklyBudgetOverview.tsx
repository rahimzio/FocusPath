"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

import type { BudgetEntry } from "@/utils/interface";

function getISOWeekString(date: Date) {
  // ISO-KW: Mo=1..So=7; KW1 = Woche mit dem ersten Donnerstag
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  if (dayNum !== 1) d.setUTCDate(d.getUTCDate() + (1 - dayNum));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-${String(week).padStart(2, "0")}`;
}

export default function WeeklyBudgetOverview() {
  const { data: session } = useSession();
  const userId = (session as any)?.user?.id as string | undefined;

  const [entry, setEntry] = useState<BudgetEntry | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const week = useMemo(() => getISOWeekString(new Date()), []);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch(`/api/finance/getWeeklyBudget?userId=${userId}&week=${week}`);
      if (!res.ok) throw new Error("Konnte Wochenbudget nicht laden");
      const data = await res.json();
      setEntry(data.budget ?? null);
    } catch (e: any) {
      setErr(e?.message ?? "Unerwarteter Fehler");
      setEntry(null);
    } finally {
      setLoading(false);
    }
  }, [userId, week]);

  useEffect(() => { load(); }, [load]);

  if (!userId) return null;
  if (loading) return <p>Budget wird geladen…</p>;
  if (err) return <p className="text-red-600">{err}</p>;
  if (!entry) return <p>Kein Budget gesetzt.</p>;

  const spent = Number(entry.spent ?? 0);
  const budget = Number(entry.budget ?? 0);
  const percent = budget > 0 ? Math.min(100, (spent / budget) * 100) : 0;
  const warning = percent >= 80;
  const remaining = budget - spent;

  const fmt = (n: number) =>
    n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Budget – KW {week.split("-")[1]}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex justify-between text-sm">
          <span className="font-medium">Verbrauch</span>
          <span>{fmt(spent)} / {fmt(budget)} €</span>
        </div>
        <Progress value={percent} />

        <div className="flex justify-between text-sm">
          <span>Verfügbar</span>
          <span className={remaining < 0 ? "text-red-600 font-semibold" : "font-semibold"}>
            {fmt(remaining)} €
          </span>
        </div>

        {entry.categories?.length > 0 && (
          <ul className="text-sm space-y-1">
            {entry.categories.map((c) => (
              <li key={c.name} className="flex justify-between">
                <span className="truncate">{c.name}</span>
                <Badge variant="secondary">{fmt(Number(c.amount ?? 0))} €</Badge>
              </li>
            ))}
          </ul>
        )}

        {entry.rating && <p className="text-sm">Bewertung: {entry.rating}</p>}

        {warning && (
          <p className="text-destructive text-sm">
            Achtung: mehr als 80 % des Budgets verbraucht!
          </p>
        )}
      </CardContent>
    </Card>
  );
}
