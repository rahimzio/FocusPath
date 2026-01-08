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
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

type Scope = "trade" | "setup" | "reflection" | "all";
type Game = "A" | "B" | "C";

type LibraryItem = {
  _id: string;
  userId: string;
  label: string;
  game: Game;
  points: number;
  active: boolean;
  scope?: "trade" | "setup" | "reflection";
  tags?: string[];
};

type DrillDoc = {
  _id?: any;
  type: "improve_drill_v1";
  userId: string;

  title: string;
  description?: string;
  active?: boolean;
  archived?: boolean;
  tags?: string[];

  factorIds?: string[];
  scope?: Scope; // default "all"
  targetGame?: Game;

  minCount?: number;
  maxCount?: number;

  createdAt?: string;
  updatedAt?: string;
  deleted?: boolean;
};

type PlanDoc = {
  _id?: any;
  type: "inchworm_plan";
  userId: string;
  period: string;
  focus?: string;
  todayDrillId?: string;
};

type DrillDoneDoc = {
  _id?: any;
  type: "improve_drill_done_v1";
  userId: string;
  drillId: string;
  date: string;
  deleted?: boolean;
};

const fetcher = (url: string) =>
  fetch(url).then(async (r) => {
    if (!r.ok) throw new Error(await r.text().catch(() => "Fetch failed"));
    return r.json();
  });

function uniqStringsFromCsv(csv: string) {
  const seen = new Set<string>();
  const out: string[] = [];
  csv
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .forEach((s) => {
      if (!seen.has(s)) {
        seen.add(s);
        out.push(s);
      }
    });
  return out;
}

function scopeLabel(s?: Scope) {
  const x = String(s ?? "all").toLowerCase();
  if (x === "trade") return "TRADE";
  if (x === "setup") return "SETUP";
  if (x === "reflection") return "REFLECTION";
  return "ALL";
}

function gradeBadgeVariant(g?: Game) {
  if (g === "A") return "default";
  if (g === "B") return "secondary";
  return "outline";
}

function todayKeyLocal() {
  const d = new Date();
  const z = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;
}

function dispatchImproveEvent(name: string, detail: any) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(name, { detail }));
}

export default function GameDrillboard({ userId }: { userId: string }) {
  const [q, setQ] = React.useState("");
  const [showArchived, setShowArchived] = React.useState(false);

  // ✅ NEW: Filters
  const [onlyToday, setOnlyToday] = React.useState(false);
  const [onlyDone, setOnlyDone] = React.useState(false);
  const [onlyNotDone, setOnlyNotDone] = React.useState(false);

  // 1) Plan (für todayDrillId)
  const { data: planData, mutate: mutatePlan } = useSWR<{ plan: PlanDoc | null }>(
    userId ? `/api/trading/improve/plan?userId=${encodeURIComponent(userId)}` : null,
    fetcher,
    { revalidateOnFocus: false }
  );
  const plan = planData?.plan ?? null;

  // 2) Drills
  const drillsKey = React.useMemo(() => {
    if (!userId) return null;
    const p = new URLSearchParams();
    p.set("userId", userId);
    p.set("limit", "200");
    p.set("archived", showArchived ? "true" : "false");
    if (q.trim()) p.set("q", q.trim());
    return `/api/trading/improve/drills?${p.toString()}`;
  }, [userId, q, showArchived]);

  const {
    data: drillsData,
    isLoading: drillsLoading,
    error: drillsError,
    mutate: mutateDrills,
  } = useSWR<{ items: DrillDoc[] }>(drillsKey, fetcher, { revalidateOnFocus: false });

  const drills = drillsData?.items ?? [];

  // 3) Game Library (für Factor-Picker)
  const { data: lib } = useSWR<{ items?: LibraryItem[] }>(
    userId ? `/api/trading/gameLibrary?userId=${userId}&active=true&limit=1000` : null,
    fetcher,
    { revalidateOnFocus: false }
  );

  const libItems = (lib?.items ?? []).filter((x) => x && x._id);

  // 4) Done Logs (nur für "heute")
  const today = React.useMemo(() => todayKeyLocal(), []);
  const doneKey = React.useMemo(() => {
    if (!userId) return null;
    const p = new URLSearchParams();
    p.set("userId", userId);
    p.set("date", today);
    return `/api/trading/improve/drills/log?${p.toString()}`;
  }, [userId, today]);

  const { data: doneData, mutate: mutateDone } = useSWR<{ items: DrillDoneDoc[] }>(doneKey, fetcher, {
    revalidateOnFocus: false,
  });

  const doneSet = React.useMemo(() => {
    const set = new Set<string>();
    (doneData?.items ?? []).forEach((d) => set.add(String(d.drillId)));
    return set;
  }, [doneData?.items]);

  // ---- Create form ----
  const [creating, setCreating] = React.useState(false);
  const [newTitle, setNewTitle] = React.useState("");
  const [newDesc, setNewDesc] = React.useState("");
  const [newScope, setNewScope] = React.useState<Scope>("all");
  const [newTargetGame, setNewTargetGame] = React.useState<Game | "">("");
  const [newTags, setNewTags] = React.useState("");
  const [newFactorIds, setNewFactorIds] = React.useState<string[]>([]);
  const [newMinCount, setNewMinCount] = React.useState<string>("");
  const [newMaxCount, setNewMaxCount] = React.useState<string>("");

  const groupedLib = React.useMemo(() => {
    const g = {
      trade: [] as LibraryItem[],
      setup: [] as LibraryItem[],
      reflection: [] as LibraryItem[],
    };
    for (const it of libItems) {
      const sc = it.scope ?? "trade";
      if (sc === "trade" || sc === "setup" || sc === "reflection") g[sc].push(it);
    }
    return g;
  }, [libItems]);

  async function createDrill() {
    if (!newTitle.trim()) return;
    setCreating(true);
    try {
      const resp = await fetch("/api/trading/improve/drills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          title: newTitle.trim(),
          description: newDesc.trim() || undefined,
          scope: newScope,
          targetGame: newTargetGame || undefined,
          tags: uniqStringsFromCsv(newTags),
          factorIds: newFactorIds,
          minCount: newMinCount.trim() ? Number(newMinCount) : undefined,
          maxCount: newMaxCount.trim() ? Number(newMaxCount) : undefined,
          active: true,
          archived: false,
        }),
      });
      if (!resp.ok) throw new Error(await resp.text().catch(() => "Create failed"));

      setNewTitle("");
      setNewDesc("");
      setNewScope("all");
      setNewTargetGame("");
      setNewTags("");
      setNewFactorIds([]);
      setNewMinCount("");
      setNewMaxCount("");

      await mutateDrills();
      dispatchImproveEvent("improve-drills-updated", { userId });
    } catch (e) {
      console.error(e);
      alert("Drill erstellen fehlgeschlagen.");
    } finally {
      setCreating(false);
    }
  }

  async function patchDrill(id: string, patch: Partial<DrillDoc>) {
    const resp = await fetch(`/api/trading/improve/drills?id=${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, ...patch }),
    });
    if (!resp.ok) throw new Error(await resp.text().catch(() => "Patch failed"));
  }

  async function archiveDrill(id: string) {
    const resp = await fetch(
      `/api/trading/improve/drills?id=${encodeURIComponent(id)}&mode=archive&userId=${encodeURIComponent(userId)}`,
      { method: "DELETE" }
    );
    if (!resp.ok) throw new Error(await resp.text().catch(() => "Archive failed"));
  }

  async function toggleTodayDrill(drillId: string) {
    if (!plan?._id) {
      alert("Kein aktiver Inchworm-Plan gefunden. Bitte erst im Planner einen Plan setzen.");
      return;
    }
    const resp = await fetch("/api/trading/improve/plan", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId,
        id: String(plan._id),
        todayDrillId: drillId,
      }),
    });
    if (!resp.ok) {
      const txt = await resp.text().catch(() => "");
      alert("todayDrillId setzen fehlgeschlagen: " + txt);
      return;
    }
    await mutatePlan();
    dispatchImproveEvent("inchworm-plan-updated", { userId });
    dispatchImproveEvent("improve-todaydrill-updated", { userId, todayDrillId: drillId });
  }

  async function markDone(drill: DrillDoc) {
    if (!drill?._id) return;
    const resp = await fetch("/api/trading/improve/drills/log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId,
        drillId: String(drill._id),
        date: today,
        scope: drill.scope ?? "all",
        factorIds: drill.factorIds ?? [],
      }),
    });
    if (!resp.ok) {
      const txt = await resp.text().catch(() => "");
      alert("Done fehlgeschlagen: " + txt);
      return;
    }
    await mutateDone();
    dispatchImproveEvent("improve-drill-done-updated", { userId, date: today, drillId: String(drill._id), done: true });
  }

  async function undoDone(drill: DrillDoc) {
    if (!drill?._id) return;
    const resp = await fetch(
      `/api/trading/improve/drills/log?userId=${encodeURIComponent(userId)}&drillId=${encodeURIComponent(
        String(drill._id)
      )}&date=${encodeURIComponent(today)}`,
      { method: "DELETE" }
    );
    if (!resp.ok) {
      const txt = await resp.text().catch(() => "");
      alert("Undo fehlgeschlagen: " + txt);
      return;
    }
    await mutateDone();
    dispatchImproveEvent("improve-drill-done-updated", { userId, date: today, drillId: String(drill._id), done: false });
  }

  // ---- Inline editor state per drill ----
  const [savingId, setSavingId] = React.useState<string | null>(null);

  async function saveInline(drill: DrillDoc, patch: Partial<DrillDoc>) {
    if (!drill._id) return;
    setSavingId(String(drill._id));
    try {
      await patchDrill(String(drill._id), patch);
      await mutateDrills();
      dispatchImproveEvent("improve-drills-updated", { userId });
    } catch (e) {
      console.error(e);
      alert("Speichern fehlgeschlagen.");
    } finally {
      setSavingId(null);
    }
  }

  const filteredDrills = React.useMemo(() => {
    let list = drills;

    if (onlyToday && plan?.todayDrillId) {
      list = list.filter((d) => String(d._id ?? "") === String(plan.todayDrillId));
    }

    if (onlyDone) {
      list = list.filter((d) => doneSet.has(String(d._id ?? "")));
    }

    if (onlyNotDone) {
      list = list.filter((d) => !doneSet.has(String(d._id ?? "")));
    }

    return list;
  }, [drills, onlyToday, onlyDone, onlyNotDone, plan?.todayDrillId, doneSet]);

  return (
    <Card className="w-full max-w-full min-w-0 overflow-hidden">
      <CardHeader className="w-full max-w-full min-w-0">
        <div className="flex items-start sm:items-center justify-between gap-2 flex-wrap">
          <div className="min-w-0">
            <CardTitle className="truncate">Improve – Drillboard</CardTitle>
            <CardDescription className="truncate">
              Drills sind Tools, um A häufiger und C seltener zu machen. Alles wird in der trading-Collection gespeichert.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="text-[10px] uppercase">
              Today: {today}
            </Badge>
            {plan?.todayDrillId ? (
              <Badge variant="default" className="text-[10px] uppercase">
                TodayDrill gesetzt
              </Badge>
            ) : (
              <Badge variant="outline" className="text-[10px] uppercase">
                Kein TodayDrill
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 w-full max-w-full min-w-0">
        {/* Top controls */}
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Suche (Titel, Tags)…"
            className="w-full"
          />

          <div className="flex items-center gap-2 px-3 py-2 rounded-md border shrink-0">
            <Checkbox id="showArchived" checked={showArchived} onCheckedChange={(v) => setShowArchived(v === true)} />
            <label htmlFor="showArchived" className="text-sm">
              Archivierte anzeigen
            </label>
          </div>
        </div>

        {/* NEW: quick filters */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-2 rounded-md border">
            <Checkbox
              id="onlyToday"
              checked={onlyToday}
              onCheckedChange={(v) => {
                const ok = v === true;
                setOnlyToday(ok);
              }}
              disabled={!plan?.todayDrillId}
            />
            <label htmlFor="onlyToday" className="text-sm">
              Nur TodayDrill
            </label>
          </div>

          <div className="flex items-center gap-2 px-3 py-2 rounded-md border">
            <Checkbox
              id="onlyDone"
              checked={onlyDone}
              onCheckedChange={(v) => {
                const ok = v === true;
                setOnlyDone(ok);
                if (ok) setOnlyNotDone(false);
              }}
            />
            <label htmlFor="onlyDone" className="text-sm">
              Nur Done
            </label>
          </div>

          <div className="flex items-center gap-2 px-3 py-2 rounded-md border">
            <Checkbox
              id="onlyNotDone"
              checked={onlyNotDone}
              onCheckedChange={(v) => {
                const ok = v === true;
                setOnlyNotDone(ok);
                if (ok) setOnlyDone(false);
              }}
            />
            <label htmlFor="onlyNotDone" className="text-sm">
              Nur Not Done
            </label>
          </div>
        </div>

        <Separator />

        {/* Create */}
        <div className="rounded-lg border p-3 space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="font-medium">Neuen Drill anlegen</div>
            <Badge variant="outline" className="text-[10px] uppercase">
              Scope {scopeLabel(newScope)}
            </Badge>
          </div>

          <div className="grid gap-2 md:grid-cols-2">
            <div className="space-y-2">
              <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Titel (konkret/prüfbar)" />
              <Input value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="Beschreibung (optional)" />

              <div className="flex flex-wrap gap-2">
                {(["all", "trade", "setup", "reflection"] as const).map((s) => (
                  <Button key={s} size="sm" variant={newScope === s ? "default" : "outline"} onClick={() => setNewScope(s)}>
                    {scopeLabel(s)}
                  </Button>
                ))}
              </div>

              <div className="flex flex-wrap gap-2">
                {(["A", "B", "C"] as const).map((g) => (
                  <Button
                    key={g}
                    size="sm"
                    variant={newTargetGame === g ? "default" : "outline"}
                    onClick={() => setNewTargetGame((prev) => (prev === g ? "" : g))}
                  >
                    Target {g}
                  </Button>
                ))}
              </div>

              <Input value={newTags} onChange={(e) => setNewTags(e.target.value)} placeholder="Tags (kommagetrennt)" />

              <div className="grid grid-cols-2 gap-2">
                <Input
                  value={newMinCount}
                  onChange={(e) => setNewMinCount(e.target.value)}
                  placeholder="minCount (A) optional"
                  inputMode="numeric"
                />
                <Input
                  value={newMaxCount}
                  onChange={(e) => setNewMaxCount(e.target.value)}
                  placeholder="maxCount (C) optional"
                  inputMode="numeric"
                />
              </div>

              <Button onClick={createDrill} disabled={creating || !newTitle.trim()} className="w-full">
                {creating ? "…" : "Drill erstellen"}
              </Button>
            </div>

            {/* Factor picker */}
            <div className="space-y-2">
              <div className="text-sm font-medium">Faktoren verlinken (GameLibrary)</div>
              <div className="text-xs text-muted-foreground">Wähle Faktoren aus (IDs werden als factorIds im Drill gespeichert).</div>

              <div className="grid gap-3 md:grid-cols-3">
                {(["trade", "setup", "reflection"] as const).map((sc) => (
                  <div key={sc} className="rounded-md border p-2">
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-medium uppercase">{sc}</div>
                      <Badge variant="outline" className="text-[10px]">
                        {groupedLib[sc].length}
                      </Badge>
                    </div>
                    <div className="mt-2 max-h-48 overflow-auto space-y-2 pr-1">
                      {groupedLib[sc].map((it) => {
                        const checked = newFactorIds.includes(it._id);
                        return (
                          <div key={it._id} className="flex items-start gap-2">
                            <Checkbox
                              checked={checked}
                              onCheckedChange={(v) => {
                                const ok = v === true;
                                setNewFactorIds((prev) => {
                                  if (ok) return prev.includes(it._id) ? prev : [...prev, it._id];
                                  return prev.filter((x) => x !== it._id);
                                });
                              }}
                              id={`new-factor-${it._id}`}
                            />
                            <label htmlFor={`new-factor-${it._id}`} className="text-sm leading-snug">
                              <span className="mr-2">
                                <Badge variant={gradeBadgeVariant(it.game)} className="text-[10px]">
                                  {it.game}
                                </Badge>
                              </span>
                              {it.label}
                            </label>
                          </div>
                        );
                      })}
                      {groupedLib[sc].length === 0 ? <div className="text-xs text-muted-foreground">Keine Items.</div> : null}
                    </div>
                  </div>
                ))}
              </div>

              {newFactorIds.length ? (
                <div className="text-xs text-muted-foreground break-words">Selected factorIds: {newFactorIds.join(", ")}</div>
              ) : (
                <div className="text-xs text-muted-foreground">Keine Faktoren ausgewählt.</div>
              )}
            </div>
          </div>
        </div>

        <Separator />

        {/* List */}
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="text-sm font-medium">Deine Drills</div>
            <Badge variant="outline" className="text-[10px] uppercase">
              {filteredDrills.length} items
            </Badge>
          </div>

          {drillsLoading ? <div className="text-sm text-muted-foreground">Lade…</div> : null}
          {drillsError ? <div className="text-sm text-destructive">Fehler beim Laden.</div> : null}
          {!drillsLoading && !drillsError && filteredDrills.length === 0 ? (
            <div className="text-sm text-muted-foreground">Keine Drills gefunden.</div>
          ) : null}

          <div className="grid gap-2">
            {filteredDrills.map((d) => {
              const id = String(d._id ?? "");
              const isToday = plan?.todayDrillId && String(plan.todayDrillId) === id;
              const doneToday = id ? doneSet.has(id) : false;
              const busy = savingId === id;

              return (
                <div key={id} className={cn("rounded-md border p-3 w-full max-w-full min-w-0", d.archived ? "opacity-60" : "opacity-100")}>
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="text-[10px] uppercase">
                          {scopeLabel(d.scope)}
                        </Badge>

                        {d.targetGame ? (
                          <Badge variant={gradeBadgeVariant(d.targetGame)} className="text-[10px] uppercase">
                            Target {d.targetGame}
                          </Badge>
                        ) : null}

                        {isToday ? (
                          <Badge variant="default" className="text-[10px] uppercase">
                            TODAY
                          </Badge>
                        ) : null}

                        {doneToday ? (
                          <Badge variant="default" className="text-[10px] uppercase">
                            DONE
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] uppercase">
                            NOT DONE
                          </Badge>
                        )}
                      </div>

                      <Input
                        className="h-9"
                        defaultValue={d.title}
                        placeholder="Titel"
                        onBlur={(e) => {
                          const v = e.target.value.trim();
                          if (v && v !== d.title) saveInline(d, { title: v });
                        }}
                      />

                      <Input
                        className="h-9"
                        defaultValue={d.description ?? ""}
                        placeholder="Beschreibung (optional)"
                        onBlur={(e) => {
                          const v = e.target.value;
                          if (v !== (d.description ?? "")) saveInline(d, { description: v });
                        }}
                      />

                      <Input
                        className="h-9"
                        defaultValue={(d.tags ?? []).join(", ")}
                        placeholder="Tags (kommagetrennt)"
                        onBlur={(e) => {
                          const tags = uniqStringsFromCsv(e.target.value);
                          if (tags.join(",") !== (d.tags ?? []).join(",")) saveInline(d, { tags });
                        }}
                      />

                      <Input
                        className="h-9"
                        defaultValue={(d.factorIds ?? []).join(", ")}
                        placeholder="factorIds (kommagetrennt)"
                        onBlur={(e) => {
                          const ids = uniqStringsFromCsv(e.target.value);
                          if (ids.join(",") !== (d.factorIds ?? []).join(",")) saveInline(d, { factorIds: ids });
                        }}
                      />

                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          className="h-9"
                          defaultValue={d.minCount != null ? String(d.minCount) : ""}
                          placeholder="minCount (A) optional"
                          inputMode="numeric"
                          onBlur={(e) => {
                            const raw = e.target.value.trim();
                            const n = raw ? Number(raw) : NaN;
                            if (raw && Number.isFinite(n) && n !== d.minCount) saveInline(d, { minCount: n });
                          }}
                        />
                        <Input
                          className="h-9"
                          defaultValue={d.maxCount != null ? String(d.maxCount) : ""}
                          placeholder="maxCount (C) optional"
                          inputMode="numeric"
                          onBlur={(e) => {
                            const raw = e.target.value.trim();
                            const n = raw ? Number(raw) : NaN;
                            if (raw && Number.isFinite(n) && n !== d.maxCount) saveInline(d, { maxCount: n });
                          }}
                        />
                      </div>
                    </div>

                    <div className="shrink-0 flex flex-col gap-2 sm:items-end">
                      <Button
                        size="sm"
                        variant={isToday ? "default" : "outline"}
                        onClick={() => toggleTodayDrill(id)}
                        disabled={!id}
                        className="whitespace-nowrap"
                      >
                        {isToday ? "Today Drill" : "Als Today setzen"}
                      </Button>

                      <Button
                        size="sm"
                        variant={doneToday ? "outline" : "default"}
                        onClick={() => (doneToday ? undoDone(d) : markDone(d))}
                        disabled={!id}
                        className="whitespace-nowrap"
                      >
                        {doneToday ? "Undo Done" : "Heute Done"}
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={async () => {
                          try {
                            await patchDrill(id, { active: !(d.active ?? true) });
                            await mutateDrills();
                            dispatchImproveEvent("improve-drills-updated", { userId });
                          } catch (e) {
                            console.error(e);
                            alert("Active toggle fehlgeschlagen.");
                          }
                        }}
                        disabled={busy || !id}
                        className="whitespace-nowrap"
                      >
                        {d.active === false ? "Aktivieren" : "Deaktivieren"}
                      </Button>

                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={async () => {
                          if (!confirm("Drill archivieren?")) return;
                          try {
                            await archiveDrill(id);
                            await mutateDrills();
                            dispatchImproveEvent("improve-drills-updated", { userId });
                          } catch (e) {
                            console.error(e);
                            alert("Archivieren fehlgeschlagen.");
                          }
                        }}
                        disabled={busy || !id}
                        className="whitespace-nowrap"
                      >
                        Archivieren
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>

      <CardFooter className="flex flex-wrap items-center justify-end gap-2">
        <Button variant="outline" onClick={() => mutateDrills()} className="whitespace-nowrap">
          Refresh
        </Button>
        <Button variant="outline" onClick={() => mutateDone()} className="whitespace-nowrap">
          Done Refresh
        </Button>
      </CardFooter>
    </Card>
  );
}
