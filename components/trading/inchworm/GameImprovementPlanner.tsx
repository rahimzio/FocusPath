"use client";

import * as React from "react";
import useSWR from "swr";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

const fetcher = (u: string) => fetch(u).then(r => r.json());

type Game = "A" | "B" | "C";
type GameLibItem = { _id: string; label: string; game: Game; points: number; active: boolean };

export default function GameImprovementPlanner({ userId }: { userId: string }) {
  // 1) Library laden (aktive Items)
  const { data: libResp } = useSWR<{ items: GameLibItem[] }>(
    userId ? `/api/trading/gameLibrary?userId=${userId}&active=true&limit=500` : null, fetcher
  );
  const items = (libResp?.items ?? []).filter(i => i.active);

  const A = items.filter(i => i.game === "A");
  const B = items.filter(i => i.game === "B");
  const C = items.filter(i => i.game === "C");

  // 2) Aktueller Plan + Baseline
  const [periodDays, setPeriodDays] = React.useState(30);
  const { data: impResp, mutate: mutatePlan } = useSWR<any>(
    userId ? `/api/trading/gameImprovement?userId=${userId}&periodDays=${periodDays}` : null, fetcher
  );

  const baseline = impResp?.baselineWeekly as { A: Record<string, number>, B: Record<string, number>, C: Record<string, number> } | undefined;
  const plan = impResp?.plan;

  // 3) Lokale Auswahl für Ziele
  const [reduceC, setReduceC] = React.useState<Record<string, number>>({});
  const [boostAB, setBoostAB] = React.useState<Record<string, number>>({});
  const [notes, setNotes] = React.useState<string>("");

  // vorhandenen Plan spiegeln
  React.useEffect(() => {
    if (plan) {
      setNotes(plan.notes ?? "");
      setPeriodDays(plan.periodDays ?? 30);
      setReduceC(plan.targets?.reduceC ?? {});
      setBoostAB(plan.targets?.boostAB ?? {});
    }
  }, [plan?._id]);

  const toggleReduceC = (label: string) => {
    setReduceC(prev => {
      const next = { ...prev };
      if (label in next) delete next[label];
      else next[label] = Math.max(0, Math.round((baseline?.C?.[label] ?? 0) / 2)); // Ziel=~50% Baseline
      return next;
    });
  };
  const toggleBoostAB = (label: string) => {
    setBoostAB(prev => {
      const next = { ...prev };
      if (label in next) delete next[label];
      else {
        const base = (baseline?.A?.[label] ?? baseline?.B?.[label] ?? 0);
        next[label] = Math.ceil(base + Math.max(1, base * 0.5)); // Ziel=Baseline + 50% (min +1)
      }
      return next;
    });
  };

  const savePlan = async () => {
    const body = {
      userId,
      periodDays,
      targets: { reduceC, boostAB },
      notes,
      upsertActive: true
    };
    const resp = await fetch("/api/trading/gameImprovement", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    if (resp.ok) await mutatePlan();
  };

  return (
    <Card className="w-full max-w-full min-w-0 overflow-hidden">
      <CardHeader className="w-full max-w-full min-w-0">
        <div className="flex items-start sm:items-center justify-between gap-2 flex-wrap">
          <div className="min-w-0">
            <CardTitle className="truncate">Inchworm-Plan (1–3 Monate)</CardTitle>
            <div className="text-sm text-muted-foreground">
              „Back Tail“ verkleinern (C-Faktoren reduzieren) & „Front Tail“ vergrößern (A/B-Faktoren steigern).
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Input
              aria-label="Plan-Zeitraum in Tagen"
              type="number"
              min={7}
              max={120}
              value={periodDays}
              onChange={e => setPeriodDays(Math.max(7, Math.min(120, Number(e.target.value) || 30)))}
              className="w-24"
            />
            <span className="text-sm text-muted-foreground whitespace-nowrap">Tage</span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6 w-full max-w-full min-w-0">
        {/* C – Back Tail reduzieren */}
        <div className="w-full max-w-full min-w-0">
          <div className="font-medium mb-1">C-Faktoren reduzieren</div>
          <div className="text-xs text-muted-foreground mb-2">
            Wähle C-Items, die du seltener sehen willst. Ziel ist eine <strong>weekly Max</strong>.
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {C.map(it => {
              const base = baseline?.C?.[it.label] ?? 0;
              const active = it.label in reduceC;
              const target = reduceC[it.label] ?? 0;
              return (
                <label
                  key={it._id}
                  className={cn(
                    "flex items-center gap-3 rounded-md border p-2 w-full max-w-full min-w-0",
                    active ? "bg-red-50 border-red-300" : "hover:bg-muted/30"
                  )}
                >
                  <Checkbox className="shrink-0" checked={active} onCheckedChange={() => toggleReduceC(it.label)} />
                  <div className="min-w-0 w-full">
                    <div className="text-sm font-medium truncate break-words">{it.label}</div>
                    <div className="text-xs text-muted-foreground">
                      Baseline: ~{base}/Woche
                      {active && <> • Ziel: ≤ {target}/Woche</>}
                    </div>
                  </div>
                </label>
              );
            })}
            {C.length === 0 && <div className="text-sm text-muted-foreground">Keine C-Items definiert.</div>}
          </div>
        </div>

        <Separator />

        {/* A/B – Front Tail steigern */}
        <div className="w-full max-w-full min-w-0">
          <div className="font-medium mb-1">A/B-Faktoren steigern</div>
          <div className="text-xs text-muted-foreground mb-2">
            Wähle A/B-Items, die du häufiger sehen willst. Ziel ist eine <strong>weekly Min</strong>.
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {[...A, ...B].map(it => {
              const base = (it.game === "A" ? baseline?.A?.[it.label] : baseline?.B?.[it.label]) ?? 0;
              const active = it.label in boostAB;
              const target = boostAB[it.label] ?? 0;
              return (
                <label
                  key={it._id}
                  className={cn(
                    "flex items-center gap-3 rounded-md border p-2 w-full max-w-full min-w-0",
                    active ? "bg-emerald-50 border-emerald-300" : "hover:bg-muted/30"
                  )}
                >
                  <Checkbox className="shrink-0" checked={active} onCheckedChange={() => toggleBoostAB(it.label)} />
                  <div className="min-w-0 w-full">
                    <div className="text-sm font-medium truncate break-words">
                      {it.label}
                      <Badge variant="outline" className="ml-2 shrink-0">{it.game}</Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Baseline: ~{base}/Woche
                      {active && <> • Ziel: ≥ {target}/Woche</>}
                    </div>
                  </div>
                </label>
              );
            })}
            {[...A, ...B].length === 0 && <div className="text-sm text-muted-foreground">Keine A/B-Items definiert.</div>}
          </div>
        </div>

        <Separator />

        {/* Notizen */}
        <div className="space-y-1 w-full max-w-full min-w-0">
          <div className="text-sm font-medium">Notizen</div>
          <Input
            className="w-full"
            placeholder="z. B. Fokus: SL-Disziplin, Overtrading vermeiden …"
            value={notes ?? ""}
            onChange={e => setNotes(e.target.value)}
          />
        </div>
      </CardContent>

      <CardFooter className="flex flex-col sm:flex-row gap-2 sm:items-center justify-between w-full max-w-full min-w-0">
        <div className="text-xs text-muted-foreground truncate">
          Trades in Periode: {impResp?.tradesCount ?? 0} • seit {impResp?.since?.slice(0,10) ?? "—"}
        </div>
        <Button onClick={savePlan} className="whitespace-nowrap">
          {plan ? "Plan aktualisieren" : "Plan starten"}
        </Button>
      </CardFooter>
    </Card>
  );
}
