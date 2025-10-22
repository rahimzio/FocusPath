// components/inchworm/InchwormPlanner.tsx
"use client";

import * as React from "react";
import useSWR from "swr";
import {
  Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { GameGrade } from "@/utils/interfaces/shared";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type GameLibItem = {
  _id: string;
  userId: string;
  label: string;
  game: GameGrade; // "A" | "B" | "C"
  points?: number; // meist 3/2/1
  active?: boolean; // nur aktive zeigen
};

type InchwormPlan = {
  type: "inchworm_plan";
  userId: string;
  period?: { start?: string; end?: string };
  focus?: string;
  selected: { A: string[]; B: string[]; C: string[] }; // ← nur IDs
  targets?: {
    avgTradesPerDay?: number;
    avgTradesPerWeek?: number;
    avgTradesPerMonth?: number;
    standardRR?: string; // "1:2.0"
  };
  _id?: string;
  createdAt?: string;
  updatedAt?: string;
};

export default function InchwormPlanner({ userId }: { userId: string }) {
  const [saving, setSaving] = React.useState(false);

  // 1) Game-Library laden (nur aktive)
  const libKey = userId
    ? `/api/trading/gameLibrary?userId=${userId}&active=true&limit=500`
    : null;
  const {
    data: libRes,
    isLoading: libLoading,
    error: libErr,
  } = useSWR<{ items: GameLibItem[] }>(libKey, fetcher, { revalidateOnFocus: false });
  const libItems = (libRes?.items ?? []).filter((i) => i.active !== false);

  const byGrade: Record<GameGrade, GameLibItem[]> = React.useMemo(
    () => ({
      A: libItems.filter((i) => i.game === "A"),
      B: libItems.filter((i) => i.game === "B"),
      C: libItems.filter((i) => i.game === "C"),
    }),
    [libItems]
  );

  // 2) Bestehenden Plan laden
  const planKey = userId ? `/api/trading/inchworm/plan?userId=${userId}` : null;
  const {
    data: planRes,
    isLoading: planLoading,
    mutate: mutatePlan,
  } = useSWR<{ plan: InchwormPlan }>(planKey, fetcher, { revalidateOnFocus: false });

  // Lokale States
  const [periodStart, setPeriodStart] = React.useState<string>("");
  const [periodEnd, setPeriodEnd] = React.useState<string>("");
  const [focus, setFocus] = React.useState<string>("");

  const [selA, setSelA] = React.useState<Set<string>>(new Set());
  const [selB, setSelB] = React.useState<Set<string>>(new Set());
  const [selC, setSelC] = React.useState<Set<string>>(new Set());

  const [avgD, setAvgD] = React.useState<string>(""); // Ø Trades/Tag
  const [avgW, setAvgW] = React.useState<string>(""); // Ø Trades/Woche
  const [avgM, setAvgM] = React.useState<string>(""); // Ø Trades/Monat
  const [stdRR, setStdRR] = React.useState<string>(""); // Standard R:R

  const LS_KEYS = {
    period: "inchworm:period",
    focus: "inchworm:focus",
    selectedA: "inchworm:selected:A",
    selectedB: "inchworm:selected:B",
    selectedC: "inchworm:selected:C",
    targets: "inchworm:targets",
  };

  function storePlanToLocalStorage(p?: InchwormPlan) {
    try {
      if (!p) return;
      const start = p?.period?.start || "";
      const end = p?.period?.end || "";
      const periodLabel = start && end ? `${start} → ${end}` : (start || end || "");
      localStorage.setItem(LS_KEYS.period, periodLabel);
      localStorage.setItem(LS_KEYS.focus, p?.focus || "");
      localStorage.setItem(LS_KEYS.selectedA, JSON.stringify(p?.selected?.A ?? []));
      localStorage.setItem(LS_KEYS.selectedB, JSON.stringify(p?.selected?.B ?? []));
      localStorage.setItem(LS_KEYS.selectedC, JSON.stringify(p?.selected?.C ?? []));
      localStorage.setItem(LS_KEYS.targets, JSON.stringify(p?.targets ?? {}));
      window.dispatchEvent(new CustomEvent("inchworm-plan-updated", { detail: { plan: p } }));
    } catch {}
  }

  // Init aus Plan
  React.useEffect(() => {
    const p = planRes?.plan;
    if (!p) return;
    setPeriodStart(p?.period?.start || "");
    setPeriodEnd(p?.period?.end || "");
    setFocus(p?.focus || "");
    setSelA(new Set(p?.selected?.A ?? []));
    setSelB(new Set(p?.selected?.B ?? []));
    setSelC(new Set(p?.selected?.C ?? []));
    setAvgD(p?.targets?.avgTradesPerDay != null ? String(p.targets.avgTradesPerDay) : "");
    setAvgW(p?.targets?.avgTradesPerWeek != null ? String(p.targets.avgTradesPerWeek) : "");
    setAvgM(p?.targets?.avgTradesPerMonth != null ? String(p.targets.avgTradesPerMonth) : "");
    setStdRR(p?.targets?.standardRR || "");
    // 🔹 Mirror ins LocalStorage + Broadcast
    storePlanToLocalStorage(p);
  }, [planRes?.plan?._id]);

// (Remove invalid spread operator here)
  const selectAll = (grade: GameGrade) => {
    const ids = byGrade[grade].map((i) => i._id);
    (grade === "A" ? setSelA : grade === "B" ? setSelB : setSelC)(new Set(ids));
  };
  const clearAll = (grade: GameGrade) => {
    (grade === "A" ? setSelA : grade === "B" ? setSelB : setSelC)(new Set());
  };

  // Toggle selection for a given grade and item
  const ontoggle = (grade: GameGrade, id: string) => {
    if (grade === "A") {
      setSelA((prev) => {
        const next = new Set(prev);
        if (next.has(id)) {
          next.delete(id);
        } else {
          next.add(id);
        }
        return next;
      });
    } else if (grade === "B") {
      setSelB((prev) => {
        const next = new Set(prev);
        if (next.has(id)) {
          next.delete(id);
        } else {
          next.add(id);
        }
        return next;
      });
    } else {
      setSelC((prev) => {
        const next = new Set(prev);
        if (next.has(id)) {
          next.delete(id);
        } else {
          next.add(id);
        }
        return next;
      });
    }
  };

  const save = async () => {
    if (!userId) return;
    setSaving(true);
    try {
      const payload: InchwormPlan = {
        type: "inchworm_plan",
        userId,
        period: { start: periodStart || undefined, end: periodEnd || undefined },
        focus: focus || undefined,
        selected: {
          A: Array.from(selA),
          B: Array.from(selB),
          C: Array.from(selC),
        },
        targets: {
          avgTradesPerDay: Number.isFinite(Number(avgD)) ? Number(avgD) : undefined,
          avgTradesPerWeek: Number.isFinite(Number(avgW)) ? Number(avgW) : undefined,
          avgTradesPerMonth: Number.isFinite(Number(avgM)) ? Number(avgM) : undefined,
          standardRR: stdRR?.trim() || undefined,
        },
      };

      const resp = await fetch("/api/trading/inchworm/plan", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!resp.ok) throw new Error(`Save failed: ${resp.status}`);
      await mutatePlan();
    } catch (e) {
      console.error(e);
      alert("Speichern fehlgeschlagen.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-screen-lg px-3 sm:px-4">
      <Card className="w-full max-w-full overflow-hidden">
        <CardHeader className="space-y-1">
          <CardTitle className="truncate">Inchworm Planner</CardTitle>
          <CardDescription className="truncate">
            Wähle deine A/B/C-Faktoren direkt aus deiner Game-Library. Keine neuen Faktoren – nur Zeitraum, Fokus & Ziele.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Zeitraum & Fokus */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div>
              <div className="text-xs mb-1">Start</div>
              <Input
                type="date"
                value={periodStart}
                onChange={(e) => setPeriodStart(e.target.value)}
              />
            </div>
            <div>
              <div className="text-xs mb-1">Ende</div>
              <Input
                type="date"
                value={periodEnd}
                onChange={(e) => setPeriodEnd(e.target.value)}
              />
            </div>
            <div className="lg:col-span-1 sm:col-span-2">
              <div className="text-xs mb-1">Fokus (kurz)</div>
              <Input
                value={focus}
                onChange={(e) => setFocus(e.target.value)}
                placeholder="z. B. 'SL-Disziplin & Entry-Qualität'"
              />
            </div>
          </div>

          <Separator />

          {/* Ziele */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <div className="text-xs mb-1">Ø Trades/Tag</div>
              <Input
                inputMode="numeric"
                value={avgD}
                onChange={(e) => setAvgD(e.target.value)}
                placeholder="z. B. 2"
              />
            </div>
            <div>
              <div className="text-xs mb-1">Ø Trades/Woche</div>
              <Input
                inputMode="numeric"
                value={avgW}
                onChange={(e) => setAvgW(e.target.value)}
                placeholder="z. B. 8"
              />
            </div>
            <div>
              <div className="text-xs mb-1">Ø Trades/Monat</div>
              <Input
                inputMode="numeric"
                value={avgM}
                onChange={(e) => setAvgM(e.target.value)}
                placeholder="z. B. 30"
              />
            </div>
            <div>
              <div className="text-xs mb-1">Standard R:R</div>
              <Input
                value={stdRR}
                onChange={(e) => setStdRR(e.target.value)}
                placeholder='z. B. "1:2.0"'
              />
            </div>
          </div>

          <Separator />

          {/* Auswahl je Kategorie (nur Library-Items) */}
          {libLoading && (
            <div className="opacity-70 text-sm">Lade Library…</div>
          )}
          {libErr && (
            <div className="text-red-600 text-sm">
              Fehler beim Laden der Library.
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {(["A", "B", "C"] as GameGrade[]).map((grade) => {
              const items = byGrade[grade];
              const selectedSet = grade === "A" ? selA : grade === "B" ? selB : selC;

              return (
                <div key={grade} className="border rounded-lg p-3 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                    <div className="font-medium">{grade}-Faktoren</div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge
                        variant={
                          grade === "A"
                            ? "default"
                            : grade === "B"
                            ? "secondary"
                            : "outline"
                        }
                      >
                        {selectedSet.size} gewählt
                      </Badge>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 px-2"
                        onClick={() => selectAll(grade)}
                      >
                        alle
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 px-2"
                        onClick={() => clearAll(grade)}
                      >
                        keine
                      </Button>
                    </div>
                  </div>

                  <div
                    className={cn(
                      "flex flex-wrap content-start gap-2 overflow-auto",
                      // begrenze die Höhe adaptiv, damit mobile nicht ewig scrollen muss
                      "max-h-48 sm:max-h-56 lg:max-h-64"
                    )}
                  >
                    {items.length === 0 && (
                      <div className="text-xs opacity-70">Keine aktiven Items.</div>
                    )}

                    {items.map((it) => {
                      const active = selectedSet.has(it._id);
                      return (
                        <button
                          key={it._id}
                          type="button"
                          className={cn(
                            "rounded-md border text-xs px-2 py-2",
                            "min-h-[34px] max-w-full truncate",
                            "transition-colors",
                            active
                              ? "bg-primary text-primary-foreground"
                              : "bg-secondary hover:bg-secondary/80"
                          )}
                          onClick={() => ontoggle(grade, it._id)}
                          aria-pressed={active}
                          title={it.label}
                        >
                          {it.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>

        <CardFooter className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-end">
          <Button
            variant="secondary"
            onClick={() => mutatePlan()}
            className="w-full sm:w-auto"
          >
            Neu laden
          </Button>
          <Button
            onClick={save}
            disabled={saving}
            className="w-full sm:w-auto"
          >
            {saving ? "Speichern…" : "Speichern"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
