// components/inchworm/InchwormPlanner.tsx
"use client";

import * as React from "react";
import useSWR from "swr";

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { GameGrade } from "@/utils/interfaces/shared";

const fetcher = (url: string) =>
  fetch(url).then(async (r) => {
    if (!r.ok) throw new Error(await r.text().catch(() => "Fetch failed"));
    return r.json();
  });

type GameLibItem = {
  _id: string;
  userId: string;
  label: string;
  game: GameGrade; // "A" | "B" | "C"
  points?: number;
  active?: boolean;
  scope?: "trade" | "setup" | "reflection";
};

type InchwormPlanDoc = {
  _id?: any;
  type: "inchworm_plan";
  userId: string;

  period: string; // free text (required by backend POST)
  focus?: string;

  from?: string; // YYYY-MM-DD
  to?: string; // YYYY-MM-DD

  selected?: any; // keep flexible
  targets?: any;

  todayDrillId?: string;

  status?: "active" | "archived";
  endResult?: "finished" | "not_finished";

  createdAt?: string;
  updatedAt?: string;
};

type Scope = "trade" | "setup" | "reflection" | "all";

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

function safeNumStrToNum(v: string) {
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

function asDateOnly(v: any) {
  const s = String(v ?? "").trim();
  if (!s) return "";
  return s.length >= 10 ? s.slice(0, 10) : s;
}

function idsFromSet(set: Set<string>) {
  return Array.from(set.values());
}

function sortByLabel(a: GameLibItem, b: GameLibItem) {
  return String(a.label ?? "").localeCompare(String(b.label ?? ""));
}

function sortDrillsByTitle(a: DrillDoc, b: DrillDoc) {
  return String(a.title ?? "").localeCompare(String(b.title ?? ""));
}

function gradeBadgeVariant(g: GameGrade) {
  if (g === "A") return "default";
  if (g === "B") return "secondary";
  return "outline";
}

function scopeBadgeLabel(s: string) {
  const x = (s || "").toLowerCase();
  if (x === "trade") return "TRADE";
  if (x === "setup") return "SETUP";
  if (x === "reflection") return "REFLECTION";
  return "ALL";
}

export default function InchwormPlanner({ userId }: { userId: string }) {
  const [saving, setSaving] = React.useState(false);
  const [archiving, setArchiving] = React.useState(false);
  const [savingTodayDrill, setSavingTodayDrill] = React.useState(false);

  // -----------------------
  // 1) Game-Library (nur aktive)
  // -----------------------
  const libKey = userId
    ? `/api/trading/gameLibrary?userId=${encodeURIComponent(userId)}&active=true&limit=500`
    : null;

  const {
    data: libRes,
    isLoading: libLoading,
    error: libErr,
  } = useSWR<{ items: GameLibItem[] }>(libKey, fetcher, {
    revalidateOnFocus: false,
  });

  const libItems = React.useMemo(
    () => (libRes?.items ?? []).filter((i) => i && i._id && i.active !== false).sort(sortByLabel),
    [libRes?.items]
  );

  const byGrade: Record<GameGrade, GameLibItem[]> = React.useMemo(
    () => ({
      A: libItems.filter((i) => i.game === "A"),
      B: libItems.filter((i) => i.game === "B"),
      C: libItems.filter((i) => i.game === "C"),
    }),
    [libItems]
  );

  // -----------------------
  // 2) Plan: /api/trading/improve/plan
  // -----------------------
  const planKey = userId ? `/api/trading/improve/plan?userId=${encodeURIComponent(userId)}` : null;

  const {
    data: planRes,
    isLoading: planLoading,
    error: planErr,
    mutate: mutatePlan,
  } = useSWR<{ plan: InchwormPlanDoc | null }>(planKey, fetcher, {
    revalidateOnFocus: false,
  });

  const plan = planRes?.plan ?? null;

  // -----------------------
  // 3) Drills (Drillboard API)
  // -----------------------
  const drillsKey = userId
    ? `/api/trading/improve/drills?userId=${encodeURIComponent(userId)}&active=true&archived=false&limit=200`
    : null;

  const {
    data: drillsRes,
    isLoading: drillsLoading,
    error: drillsErr,
    mutate: mutateDrills,
  } = useSWR<{ items: DrillDoc[] }>(drillsKey, fetcher, {
    revalidateOnFocus: false,
  });

  const drills = React.useMemo(
    () => (drillsRes?.items ?? []).filter(Boolean).sort(sortDrillsByTitle),
    [drillsRes?.items]
  );

  // --- Local UI State ---
  const [period, setPeriod] = React.useState<string>("");
  const [focus, setFocus] = React.useState<string>("");
  const [from, setFrom] = React.useState<string>("");
  const [to, setTo] = React.useState<string>("");

  const [selA, setSelA] = React.useState<Set<string>>(new Set());
  const [selB, setSelB] = React.useState<Set<string>>(new Set());
  const [selC, setSelC] = React.useState<Set<string>>(new Set());

  const [avgD, setAvgD] = React.useState<string>("");
  const [avgW, setAvgW] = React.useState<string>("");
  const [avgM, setAvgM] = React.useState<string>("");
  const [stdRR, setStdRR] = React.useState<string>("");

  // Drillboard block states
  const [drillQuery, setDrillQuery] = React.useState("");
  const [pickedDrillId, setPickedDrillId] = React.useState<string>("");

  const filteredDrills = React.useMemo(() => {
    const q = drillQuery.trim().toLowerCase();
    if (!q) return drills;
    return drills.filter((d) => String(d.title ?? "").toLowerCase().includes(q));
  }, [drills, drillQuery]);

  const currentTodayDrill = React.useMemo(() => {
    if (!plan?.todayDrillId) return null;
    return drills.find((d) => String(d._id) === String(plan.todayDrillId)) ?? null;
  }, [plan?.todayDrillId, drills]);

  // Init aus Plan
  React.useEffect(() => {
    if (!plan) return;

    setPeriod(String(plan.period ?? ""));
    setFocus(String(plan.focus ?? ""));
    setFrom(asDateOnly(plan.from));
    setTo(asDateOnly(plan.to));

    const selected = (plan.selected ?? {}) as any;
    setSelA(new Set(Array.isArray(selected.A) ? selected.A.map(String) : []));
    setSelB(new Set(Array.isArray(selected.B) ? selected.B.map(String) : []));
    setSelC(new Set(Array.isArray(selected.C) ? selected.C.map(String) : []));

    const t = (plan.targets ?? {}) as any;
    setAvgD(t.avgTradesPerDay != null ? String(t.avgTradesPerDay) : "");
    setAvgW(t.avgTradesPerWeek != null ? String(t.avgTradesPerWeek) : "");
    setAvgM(t.avgTradesPerMonth != null ? String(t.avgTradesPerMonth) : "");
    setStdRR(t.standardRR != null ? String(t.standardRR) : "");

    // reset drill picker on plan load
    setPickedDrillId("");
  }, [plan?._id]);

  // selection helpers
  const selectAll = (grade: GameGrade) => {
    const ids = byGrade[grade].map((i) => String(i._id));
    if (grade === "A") setSelA(new Set(ids));
    if (grade === "B") setSelB(new Set(ids));
    if (grade === "C") setSelC(new Set(ids));
  };

  const clearAll = (grade: GameGrade) => {
    if (grade === "A") setSelA(new Set());
    if (grade === "B") setSelB(new Set());
    if (grade === "C") setSelC(new Set());
  };

  const onToggle = (grade: GameGrade, id: string) => {
    const setter = grade === "A" ? setSelA : grade === "B" ? setSelB : setSelC;
    setter((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // -----------------------
  // SAVE PLAN (POST = Plan setzen / neu starten)
  // -----------------------
  async function savePlan() {
    if (!userId) return;

    const cleanPeriod = period.trim();
    if (!cleanPeriod) {
      alert("Bitte setze einen Zeitraum (period).");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        userId,
        period: cleanPeriod,
        focus: focus.trim() || undefined,
        from: from || undefined,
        to: to || undefined,
        selected: {
          A: idsFromSet(selA),
          B: idsFromSet(selB),
          C: idsFromSet(selC),
        },
        targets: {
          avgTradesPerDay: safeNumStrToNum(avgD),
          avgTradesPerWeek: safeNumStrToNum(avgW),
          avgTradesPerMonth: safeNumStrToNum(avgM),
          standardRR: stdRR.trim() || undefined,
        },
      };

      const resp = await fetch("/api/trading/improve/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!resp.ok) {
        const txt = await resp.text().catch(() => "");
        throw new Error(txt || `Save failed: ${resp.status}`);
      }

      await mutatePlan();
      window.dispatchEvent(new CustomEvent("inchworm-plan-updated", { detail: { userId } }));
    } catch (e: any) {
      console.error(e);
      alert("Speichern fehlgeschlagen: " + (e?.message ?? ""));
    } finally {
      setSaving(false);
    }
  }

  // -----------------------
  // ARCHIVE PLAN (PATCH)
  // -----------------------
  async function archiveCurrentPlan() {
    if (!userId || !plan?._id) return;
    setArchiving(true);
    try {
      const resp = await fetch("/api/trading/improve/plan", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          id: String(plan._id),
          status: "archived",
        }),
      });
      if (!resp.ok) {
        const txt = await resp.text().catch(() => "");
        throw new Error(txt || `Archive failed: ${resp.status}`);
      }
      await mutatePlan();
      window.dispatchEvent(new CustomEvent("inchworm-plan-updated", { detail: { userId } }));
    } catch (e: any) {
      console.error(e);
      alert("Archivieren fehlgeschlagen: " + (e?.message ?? ""));
    } finally {
      setArchiving(false);
    }
  }

  // -----------------------
  // SET TODAY DRILL (PATCH todayDrillId)
  // -----------------------
  async function setTodayDrill() {
    if (!userId) return;
    if (!plan?._id) {
      alert("Bitte zuerst den Plan speichern (damit eine Plan-ID existiert).");
      return;
    }
    if (!pickedDrillId) {
      alert("Bitte wähle einen Drill aus.");
      return;
    }

    setSavingTodayDrill(true);
    try {
      const resp = await fetch("/api/trading/improve/plan", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          id: String(plan._id),
          todayDrillId: String(pickedDrillId),
        }),
      });

      if (!resp.ok) {
        const txt = await resp.text().catch(() => "");
        throw new Error(txt || `Set drill failed: ${resp.status}`);
      }

      await Promise.all([mutatePlan(), mutateDrills()]);
      window.dispatchEvent(new CustomEvent("inchworm-plan-updated", { detail: { userId } }));
    } catch (e: any) {
      console.error(e);
      alert("Today Drill setzen fehlgeschlagen: " + (e?.message ?? ""));
    } finally {
      setSavingTodayDrill(false);
    }
  }

  async function clearTodayDrill() {
    if (!userId) return;
    if (!plan?._id) return;

    setSavingTodayDrill(true);
    try {
      const resp = await fetch("/api/trading/improve/plan", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          id: String(plan._id),
          todayDrillId: "", // backend setzt nur wenn truthy – daher: wir lassen “clear” als separaten Schritt:
        }),
      });

      // Backend lässt currently empty-string evtl. durchfallen -> deshalb:
      // Wenn du wirklich "clearen" willst: wir setzen todayDrillId auf undefined NICHT möglich.
      // Workaround: setze auf einen "NONE" string und filter das in overview raus.
      // => minimaler Fix hier: wir patchen NICHT, sondern sagen dir sauber was zu tun ist.
      if (!resp.ok) {
        const txt = await resp.text().catch(() => "");
        throw new Error(txt || `Clear drill failed: ${resp.status}`);
      }

      await mutatePlan();
      window.dispatchEvent(new CustomEvent("inchworm-plan-updated", { detail: { userId } }));
    } catch (e: any) {
      console.error(e);
      alert("Clear aktuell noch nicht sauber unterstützt (Backend patcht empty nicht). Mini-Fix: im plan.ts PATCH erlauben empty => unset. Sag kurz Bescheid, dann patchen wir plan.ts in 2 Zeilen.");
    } finally {
      setSavingTodayDrill(false);
    }
  }

  const isBusy = saving || archiving || savingTodayDrill;

  return (
    <div className="mx-auto w-full max-w-screen-lg px-3 sm:px-4">
      <Card className="w-full max-w-full overflow-hidden">
        <CardHeader className="space-y-1">
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <div className="min-w-0">
              <CardTitle className="truncate">Inchworm Planner</CardTitle>
              <CardDescription className="truncate">
                Plan wird über <span className="font-medium">/api/trading/improve/plan</span> gespeichert (kein LocalStorage).
              </CardDescription>
            </div>

            {plan?._id ? (
              <Badge variant="outline" className="text-[10px] uppercase">
                Active Plan
              </Badge>
            ) : (
              <Badge variant="outline" className="text-[10px] uppercase">
                No Plan
              </Badge>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Zeitraum + Fokus */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="lg:col-span-2">
              <div className="text-xs mb-1">Zeitraum (period) *</div>
              <Input
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                placeholder="z.B. Jan 2026 / FTMO Swing / Woche 1–4"
              />
              <div className="text-[11px] text-muted-foreground mt-1">
                period ist freier Text und wird in der DB gespeichert.
              </div>
            </div>

            <div>
              <div className="text-xs mb-1">From (optional)</div>
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </div>

            <div>
              <div className="text-xs mb-1">To (optional)</div>
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>

            <div className="sm:col-span-2 lg:col-span-4">
              <div className="text-xs mb-1">Fokus (kurz)</div>
              <Input
                value={focus}
                onChange={(e) => setFocus(e.target.value)}
                placeholder="z.B. 'SL-Disziplin & Entry-Qualität'"
              />
            </div>
          </div>

          <Separator />

          {/* Targets */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <div className="text-xs mb-1">Ø Trades/Tag</div>
              <Input inputMode="numeric" value={avgD} onChange={(e) => setAvgD(e.target.value)} placeholder="z.B. 2" />
            </div>
            <div>
              <div className="text-xs mb-1">Ø Trades/Woche</div>
              <Input inputMode="numeric" value={avgW} onChange={(e) => setAvgW(e.target.value)} placeholder="z.B. 8" />
            </div>
            <div>
              <div className="text-xs mb-1">Ø Trades/Monat</div>
              <Input inputMode="numeric" value={avgM} onChange={(e) => setAvgM(e.target.value)} placeholder="z.B. 30" />
            </div>
            <div>
              <div className="text-xs mb-1">Standard R:R</div>
              <Input value={stdRR} onChange={(e) => setStdRR(e.target.value)} placeholder='z.B. "1:2.0"' />
            </div>
          </div>

          <Separator />

          {/* ✅ DRILLBOARD BLOCK */}
          <div className="rounded-lg border p-3 sm:p-4">
            <div className="flex items-start justify-between gap-2 flex-wrap">
              <div className="min-w-0">
                <div className="text-sm font-medium">Heutiger Drill (Overview)</div>
                <div className="text-xs text-muted-foreground">
                  Auswahl wird im Plan gespeichert (<code>todayDrillId</code>) und erscheint im Improve Overview.
                </div>
              </div>

              {currentTodayDrill ? (
                <Badge variant="outline" className="text-[10px] uppercase">
                  CURRENT
                </Badge>
              ) : (
                <Badge variant="outline" className="text-[10px] uppercase">
                  NONE
                </Badge>
              )}
            </div>

            {drillsErr ? (
              <div className="text-sm text-destructive mt-2">Drills konnten nicht geladen werden.</div>
            ) : null}
            {drillsLoading ? (
              <div className="text-sm text-muted-foreground mt-2">Lade Drills…</div>
            ) : null}

            {currentTodayDrill ? (
              <div className="mt-3 rounded-md border p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{currentTodayDrill.title}</div>
                    <div className="text-[11px] text-muted-foreground">
                      Target: {currentTodayDrill.targetGame ?? "—"} · Scope:{" "}
                      {scopeBadgeLabel(currentTodayDrill.scope ?? "all")}
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <div className="text-xs mb-1">Drill suchen</div>
                <Input value={drillQuery} onChange={(e) => setDrillQuery(e.target.value)} placeholder="z.B. SL, discipline, hesitation…" />
              </div>

              <div>
                <div className="text-xs mb-1">Drill auswählen</div>
                <select
                  className="w-full h-10 rounded-md border bg-background px-3 text-sm"
                  value={pickedDrillId}
                  onChange={(e) => setPickedDrillId(e.target.value)}
                >
                  <option value="">— auswählen —</option>
                  {filteredDrills.map((d) => (
                    <option key={String(d._id)} value={String(d._id)}>
                      {d.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-3 flex gap-2 flex-wrap">
              <Button
                onClick={setTodayDrill}
                disabled={isBusy || !pickedDrillId || !plan?._id}
                className="w-full sm:w-auto"
              >
                {savingTodayDrill ? "…" : "Als heutigen Drill setzen"}
              </Button>

              <Button
                variant="outline"
                onClick={clearTodayDrill}
                disabled={true}
                className="w-full sm:w-auto"
                title="Clear braucht 1 Mini-Backend-Fix (unset)."
              >
                Clear (kommt gleich)
              </Button>

              {!plan?._id ? (
                <div className="text-xs text-muted-foreground self-center">
                  Hinweis: Speichere zuerst einen Plan, damit eine Plan-ID existiert.
                </div>
              ) : null}
            </div>
          </div>

          <Separator />

          {/* Library status */}
          {libErr ? <div className="text-sm text-destructive">Game Library konnte nicht geladen werden.</div> : null}
          {libLoading ? <div className="text-sm text-muted-foreground">Lade Game Library…</div> : null}
          {planErr ? <div className="text-sm text-destructive">Plan konnte nicht geladen werden.</div> : null}
          {planLoading ? <div className="text-sm text-muted-foreground">Lade Plan…</div> : null}

          {/* A/B/C Picker */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {(["A", "B", "C"] as GameGrade[]).map((g) => {
              const items = byGrade[g] ?? [];
              const set = g === "A" ? selA : g === "B" ? selB : selC;
              return (
                <div key={g} className="rounded-md border p-3 w-full max-w-full min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <Badge variant={gradeBadgeVariant(g)} className="shrink-0">
                        {g}
                      </Badge>
                      <div className="text-sm font-medium truncate">{g}-Faktoren</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => selectAll(g)} disabled={!items.length}>
                        All
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => clearAll(g)} disabled={!set.size}>
                        Clear
                      </Button>
                    </div>
                  </div>

                  <div className="text-xs text-muted-foreground mt-1">
                    Selected: <span className="font-medium">{set.size}</span>
                  </div>

                  <div className="mt-3 max-h-[260px] overflow-auto space-y-1 pr-1">
                    {items.length === 0 ? (
                      <div className="text-xs text-muted-foreground">Keine {g}-Items gefunden.</div>
                    ) : (
                      items.map((it) => {
                        const checked = set.has(String(it._id));
                        return (
                          <button
                            key={it._id}
                            type="button"
                            onClick={() => onToggle(g, String(it._id))}
                            className={cn(
                              "w-full text-left rounded-md border px-2 py-2 text-sm flex items-center justify-between gap-2",
                              checked ? "bg-muted" : "bg-background"
                            )}
                          >
                            <span className="truncate">{it.label}</span>
                            <span className="text-xs text-muted-foreground shrink-0">{checked ? "✓" : ""}</span>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>

        <CardFooter className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
          <div className="text-xs text-muted-foreground">
            {plan?._id ? (
              <>
                Aktiver Plan: <span className="font-medium">{String(plan.period ?? "")}</span>
              </>
            ) : (
              <>Noch kein Plan gespeichert.</>
            )}
          </div>

          <div className="flex gap-2 flex-wrap w-full sm:w-auto">
            {plan?._id ? (
              <Button
                variant="outline"
                onClick={archiveCurrentPlan}
                disabled={isBusy}
                className="w-full sm:w-auto"
              >
                {archiving ? "…" : "Plan archivieren"}
              </Button>
            ) : null}

            <Button onClick={savePlan} disabled={isBusy} className="w-full sm:w-auto">
              {saving ? "…" : "Plan speichern"}
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
