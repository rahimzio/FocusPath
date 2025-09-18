// ActivePlanSummary.tsx
"use client";
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

function ym(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function EUR(n: number) {
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(
    Number(n || 0)
  );
}

export default function ActivePlanSummary({ userId }: { userId: string }) {
  const [plan, setPlan] = useState<any>(null);
  const [week, setWeek] = useState<string>("");
  const [weekly, setWeekly] = useState<{ budget: number; spent: number } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // ISO Woche "YYYY-Www"
    const d = new Date();
    const dd = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const day = dd.getUTCDay() || 7;
    if (day !== 1) dd.setUTCDate(dd.getUTCDate() + (1 - day));
    const yearStart = new Date(Date.UTC(dd.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil(
      ((dd.getTime() - yearStart.getTime()) / 86400000 + 1) / 7
    );
    setWeek(`${dd.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`);
  }, []);

  async function load() {
    setLoading(true);
    try {
      const month = ym();
      const p = await fetch(
        `/api/finance/plan/get?userId=${userId}&month=${month}`
      ).then((r) => (r.ok ? r.json() : { plan: null }));
      setPlan(p.plan || null);
      if (week) {
        const wb = await fetch(
          `/api/finance/getWeeklyBudget?userId=${userId}&week=${week}`
        ).then((r) => (r.ok ? r.json() : null));
        const b = wb?.budget;
        setWeekly(
          b && typeof b.budget === "number"
            ? { budget: b.budget, spent: Number(b.spent || 0) }
            : null
        );
      }
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, week]);

  const fun = useMemo(() => {
    if (!plan) return 0;
    if (typeof plan.funmoneyFinal === "number") return plan.funmoneyFinal;
    if (typeof plan.funmoneyAmount === "number") return plan.funmoneyAmount;
    if (typeof plan.funmoneyPct === "number")
      return Number(plan.total || 0) * (plan.funmoneyPct / 100);
    return 0;
  }, [plan]);

  if (!plan) return null;

  const percent = weekly ? Math.min(100, (weekly.spent / (weekly.budget || 1)) * 100) : 0;

  return (
    <Card className="w-full max-w-full overflow-hidden">
      <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <CardTitle className="text-gray-800 dark:text-gray-100">
          Aktiver Finanzplan – {ym()}
        </CardTitle>
        <Button variant="outline" size="sm" onClick={load} disabled={loading} className="w-full sm:w-auto">
          {loading ? "Aktualisiere…" : "Refresh"}
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>Insgesamt geplant: {EUR(plan.total)}</div>
        <div>
          Funmoney: <strong>{EUR(fun)}</strong>{" "}
          {plan.activatedAt ? "(aktiviert)" : "(noch nicht aktiviert)"}
        </div>

        {weekly && (
          <>
            <div className="flex justify-between text-sm">
              <span>Diese Woche</span>
              <span>
                {EUR(weekly.spent)} / {EUR(weekly.budget)}
              </span>
            </div>
            <Progress value={percent} />
            <div className="text-sm">
              Verfügbar: <strong>{EUR(weekly.budget - weekly.spent)}</strong>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
