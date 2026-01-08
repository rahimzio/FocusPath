"use client";

import * as React from "react";
import useSWR from "swr";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Scope = "trade" | "setup" | "reflection" | "all";
type Metric = "count" | "rate";

type FactorRow = {
  id: string;
  label: string;
  scope: "trade" | "setup" | "reflection";
  grade: "A" | "B" | "C";
  count: number;
  rate: number; // 0..1
};

type PlanPeriod = string | { start?: string; end?: string };

type InchwormPlan = {
  _id?: any;
  type: "inchworm_plan";
  userId: string;
  period: PlanPeriod;
  focus?: string;
  todayDrillId?: string;
};

type DrillDoc = {
  _id?: any;
  type: "improve_drill_v1";
  userId: string;
  title: string;
  description?: string;
  factorIds?: string[];
  scope?: Scope;
  targetGame?: "A" | "B" | "C";
  minCount?: number;
  maxCount?: number;
  active?: boolean;
  archived?: boolean;
};

const fetcher = (url: string) =>
  fetch(url).then((res) => {
    if (!res.ok) throw new Error("Failed to fetch");
    return res.json();
  });

function pct(n: number) {
  return `${Math.round(n * 100)}%`;
}

function scopeBadgeLabel(s: string) {
  const x = (s || "").toLowerCase();
  if (x === "trade") return "TRADE";
  if (x === "setup") return "SETUP";
  if (x === "reflection") return "REFLECTION";
  return "ALL";
}

function periodLabel(period: PlanPeriod | undefined | null) {
  if (!period) return "— noch kein Zeitraum gesetzt —";
  if (typeof period === "string") return period.trim() || "— noch kein Zeitraum gesetzt —";
  const start = (period.start || "").trim();
  const end = (period.end || "").trim();
  if (start && end) return `${start} → ${end}`;
  return start || end || "— noch kein Zeitraum gesetzt —";
}

function todayKeyLocal() {
  const d = new Date();
  const z = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;
}

export function ImproveAtAGlance({
  userId,
  onJump,
  className,
}: {
  userId: string;
  className?: string;
  onJump: (target: "planner" | "progress" | "drillboard" | "improvement-planner") => void;
}) {
  const [scope, setScope] = React.useState<Scope>("all");
  const [metric, setMetric] = React.useState<Metric>("count");

  const key = React.useMemo(() => {
    if (!userId) return null;
    const p = new URLSearchParams();
    p.set("userId", userId);
    p.set("period", "prev_month");
    p.set("scope", scope);
    p.set("metric", metric);
    p.set("top", "3");
    p.set("minCount", "1");
    return `/api/trading/improve/overview?${p.toString()}`;
  }, [userId, scope, metric]);

  const { data, error, isLoading, mutate } = useSWR<any>(key, fetcher, { revalidateOnFocus: false });

  // ✅ Event sync: Drillboard/Planner Updates trigger mutate()
  React.useEffect(() => {
    const onAny = () => mutate();
    window.addEventListener("improve-drill-done-updated", onAny as any);
    window.addEventListener("improve-todaydrill-updated", onAny as any);
    window.addEventListener("improve-drills-updated", onAny as any);
    window.addEventListener("inchworm-plan-updated", onAny as any);
    return () => {
      window.removeEventListener("improve-drill-done-updated", onAny as any);
      window.removeEventListener("improve-todaydrill-updated", onAny as any);
      window.removeEventListener("improve-drills-updated", onAny as any);
      window.removeEventListener("inchworm-plan-updated", onAny as any);
    };
  }, [mutate]);

  const plan: InchwormPlan | null = data?.plan ?? null;
  const todayDrill: DrillDoc | null = data?.todayDrill ?? null;
  const drillDoneToday: boolean = !!data?.drillDoneToday;

  const topC: FactorRow[] = data?.factors?.topC ?? [];
  const lowA: FactorRow[] = data?.factors?.lowA ?? [];

  const range = data?.range;
  const totals = data?.totals;

  const today = React.useMemo(() => todayKeyLocal(), []);

  const [busyDone, setBusyDone] = React.useState(false);

  async function markDrillDone() {
    if (!todayDrill?._id) return;
    setBusyDone(true);
    try {
      const resp = await fetch("/api/trading/improve/drills/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          drillId: String(todayDrill._id),
          date: today, // ✅ local today
          scope: todayDrill.scope ?? "all",
          factorIds: todayDrill.factorIds ?? [],
        }),
      });
      if (!resp.ok) {
        const txt = await resp.text().catch(() => "");
        alert("Drill Done fehlgeschlagen: " + txt);
        return;
      }
      await mutate();
    } finally {
      setBusyDone(false);
    }
  }

  async function undoDrillDone() {
    if (!todayDrill?._id) return;
    setBusyDone(true);
    try {
      const resp = await fetch(
        `/api/trading/improve/drills/log?userId=${encodeURIComponent(userId)}&drillId=${encodeURIComponent(
          String(todayDrill._id)
        )}&date=${encodeURIComponent(today)}`,
        { method: "DELETE" }
      );
      if (!resp.ok) {
        const txt = await resp.text().catch(() => "");
        alert("Undo fehlgeschlagen: " + txt);
        return;
      }
      await mutate();
    } finally {
      setBusyDone(false);
    }
  }

  const periodText = periodLabel(plan?.period);
  const focusText = (plan?.focus || "").trim() || "— noch kein Fokus gesetzt —";
  const drillText = (todayDrill?.title || "").trim() || "— noch kein Drill geplant —";

  const hasTodayDrill = !!todayDrill?._id;

  return (
    <div className={cn("space-y-4", className)}>
      <Card className="w-full max-w-full min-w-0 overflow-hidden">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <CardTitle className="text-base sm:text-lg">Improve – Überblick</CardTitle>

            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="text-[10px] uppercase">
                {scopeBadgeLabel(scope)}
              </Badge>
              <Button variant={metric === "count" ? "default" : "outline"} size="sm" onClick={() => setMetric("count")}>
                Count
              </Button>
              <Button variant={metric === "rate" ? "default" : "outline"} size="sm" onClick={() => setMetric("rate")}>
                Rate
              </Button>
            </div>
          </div>

          {range?.from && range?.to ? (
            <div className="text-xs text-muted-foreground mt-1">
              Zeitraum (Faktoren): {range.from} → {range.to} · Trades {totals?.trades ?? 0} · Exec Setups{" "}
              {totals?.executedSetups ?? 0} · Reflections {totals?.dayReflections ?? 0}
            </div>
          ) : null}
        </CardHeader>

        <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 w-full max-w-full min-w-0">
          {/* Aktiver Zeitraum */}
          <div className="rounded-lg border p-3 sm:p-4 w-full max-w-full min-w-0">
            <div className="text-xs text-muted-foreground mb-1">Aktiver Zeitraum</div>
            <div className="font-medium break-words">{periodText}</div>
            <Button variant="ghost" size="sm" className="mt-2 w-full sm:w-auto justify-center" onClick={() => onJump("planner")}>
              Zeitraum & Ziele setzen
            </Button>
          </div>

          {/* Heutiger Drill */}
          <div className="rounded-lg border p-3 sm:p-4 w-full max-w-full min-w-0">
            <div className="text-xs text-muted-foreground mb-1">Heutiger Drill</div>
            <div className="font-medium break-words">{drillText}</div>

            <div className="mt-2 flex items-center gap-2 flex-wrap">
              {todayDrill?.targetGame ? (
                <Badge variant="outline" className="text-[10px] uppercase">
                  Target {todayDrill.targetGame}
                </Badge>
              ) : null}
              {todayDrill?.scope ? (
                <Badge variant="outline" className="text-[10px] uppercase">
                  {scopeBadgeLabel(todayDrill.scope)}
                </Badge>
              ) : null}

              {hasTodayDrill ? (
                drillDoneToday ? (
                  <Badge variant="default" className="text-[10px] uppercase">
                    DONE
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-[10px] uppercase">
                    NOT DONE
                  </Badge>
                )
              ) : (
                <Badge variant="outline" className="text-[10px] uppercase">
                  NO TODAY DRILL
                </Badge>
              )}
            </div>

            {/* ✅ NEW: Hinweis wenn TodayDrill fehlt */}
            {!hasTodayDrill ? (
              <div className="mt-2 text-xs text-muted-foreground">
                Setze im Drillboard einen „Today Drill“, damit du hier Done/Undo nutzen kannst.
              </div>
            ) : null}

            <div className="mt-2 flex gap-2 flex-wrap">
              <Button
                variant={drillDoneToday ? "outline" : "default"}
                size="sm"
                className="w-full sm:w-auto justify-center"
                onClick={markDrillDone}
                disabled={busyDone || !hasTodayDrill || drillDoneToday}
              >
                {busyDone ? "…" : "Heute done"}
              </Button>

              <Button
                variant="outline"
                size="sm"
                className="w-full sm:w-auto justify-center"
                onClick={undoDrillDone}
                disabled={busyDone || !hasTodayDrill || !drillDoneToday}
              >
                {busyDone ? "…" : "Undo Done"}
              </Button>

              <Button
                variant="outline"
                size="sm"
                className="w-full sm:w-auto justify-center"
                onClick={() => onJump("drillboard")}
              >
                Drillboard öffnen
              </Button>
            </div>
          </div>

          {/* Fokus */}
          <div className="rounded-lg border p-3 sm:p-4 w-full max-w-full min-w-0">
            <div className="text-xs text-muted-foreground mb-1">Fokus (Inchworm)</div>
            <div className="font-medium break-words">{focusText}</div>

            <Button variant="ghost" size="sm" className="mt-2 w-full sm:w-auto justify-center" onClick={() => onJump("progress")}>
              Fortschritt ansehen
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Factors */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">C-Game Faktoren (häufig)</CardTitle>
            <div className="text-xs text-muted-foreground">Top C aus Trades + executed Setups + Reflections (mind. 1×).</div>
          </CardHeader>
          <CardContent className="space-y-2">
            {isLoading ? <div className="text-xs text-muted-foreground">Lade…</div> : null}
            {error ? <div className="text-xs text-destructive">Fehler beim Laden.</div> : null}

            {!isLoading && !error && topC.length === 0 ? (
              <div className="text-xs text-muted-foreground">Keine C-Faktoren im Zeitraum gefunden.</div>
            ) : null}

            {topC.map((r) => (
              <div key={`${r.scope}-${r.id}`} className="flex items-center justify-between gap-2 rounded-md border p-2">
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{r.label}</div>
                  <div className="text-[10px] text-muted-foreground uppercase">{r.scope}</div>
                </div>
                <Badge variant="outline" className="shrink-0">
                  {metric === "count" ? `${r.count}x` : pct(r.rate)}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">A-Game Faktoren (selten)</CardTitle>
            <div className="text-xs text-muted-foreground">Low A (die du öfter sehen willst) – sortiert nach {metric}.</div>
          </CardHeader>
          <CardContent className="space-y-2">
            {isLoading ? <div className="text-xs text-muted-foreground">Lade…</div> : null}
            {error ? <div className="text-xs text-destructive">Fehler beim Laden.</div> : null}

            {!isLoading && !error && lowA.length === 0 ? (
              <div className="text-xs text-muted-foreground">Keine A-Faktoren im Zeitraum gefunden.</div>
            ) : null}

            {lowA.map((r) => (
              <div key={`${r.scope}-${r.id}`} className="flex items-center justify-between gap-2 rounded-md border p-2">
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{r.label}</div>
                  <div className="text-[10px] text-muted-foreground uppercase">{r.scope}</div>
                </div>
                <Badge variant="outline" className="shrink-0">
                  {metric === "count" ? `${r.count}x` : pct(r.rate)}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default ImproveAtAGlance;
