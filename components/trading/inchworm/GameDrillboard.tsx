"use client";

import * as React from "react";
import useSWR from "swr";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";

type LibraryItem = {
  _id: string;
  userId: string;
  label: string;
  game: "A" | "B" | "C";
  points: number;
  active: boolean;
  tags?: string[];
};

type Drill = {
  id: string;
  fromId?: string;
  label: string;
  grade: "A" | "B" | "C";
  repsTarget: number;
  repsDone: number;
  todayDone?: boolean;
};

type DrillBoard = {
  _id?: string;
  recordType: "gameDrill";
  userId: string;
  title: string;
  drills: Drill[];
  createdAt: string;
  updatedAt: string;
};

const fetcher = (url: string) => fetch(url).then(r => (r.ok ? r.json() : { items: [] }));

const gradeBadge = (g: "A" | "B" | "C") =>
  g === "A" ? "default" : g === "B" ? "secondary" : "outline";

const barBgForGrade: Record<"A" | "B" | "C", string> = {
  A: "bg-emerald-500",
  B: "bg-amber-500",
  C: "bg-rose-500",
};

export default function GameDrillboard({ userId }: { userId: string }) {
  const { data: lib } = useSWR<{ items?: LibraryItem[] }>(
    userId ? `/api/trading/gameLibrary?userId=${userId}&active=true&limit=500` : null,
    fetcher
  );

  const [title, setTitle] = React.useState("Drillboard – Schwächen schließen");
  const [drills, setDrills] = React.useState<Drill[]>([]);
  const [pending, setPending] = React.useState(false);

  // 🧠 Lokale Wiederherstellung (falls vorhanden)
  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(`game-drillboard:${userId}`);
      if (!raw) return;
      const saved: DrillBoard = JSON.parse(raw);
      if (saved?.userId === userId) {
        setTitle(saved.title || "Drillboard – Schwächen schließen");
        setDrills(Array.isArray(saved.drills) ? saved.drills : []);
      }
    } catch {}
  }, [userId]);

  const addFrom = (it: LibraryItem) => {
    setDrills(prev => [
      ...prev,
      {
        id: crypto.randomUUID(),
        fromId: it._id,
        label: it.label,
        grade: it.game,
        repsTarget: it.game === "C" ? 20 : it.game === "B" ? 15 : 10,
        repsDone: 0,
      },
    ]);
  };

  const addCustom = (grade: "A" | "B" | "C") => {
    setDrills(prev => [
      ...prev,
      {
        id: crypto.randomUUID(),
        label: "",
        grade,
        repsTarget: grade === "C" ? 20 : grade === "B" ? 15 : 10,
        repsDone: 0,
      },
    ]);
  };

  const updateDrill = (id: string, patch: Partial<Drill>) => {
    setDrills(prev => prev.map(d => (d.id === id ? { ...d, ...patch } : d)));
  };

  const removeDrill = (id: string) => {
    setDrills(prev => prev.filter(d => d.id !== id));
  };

  const inc = (id: string, delta: number) => {
    setDrills(prev => prev.map(d => (d.id === id ? { ...d, repsDone: Math.max(0, d.repsDone + delta) } : d)));
  };

  const save = async () => {
    setPending(true);
    try {
      const now = new Date().toISOString();
      const payload: DrillBoard = {
        recordType: "gameDrill",
        userId,
        title,
        drills,
        createdAt: now,
        updatedAt: now,
      };

      localStorage.setItem(`game-drillboard:${userId}`, JSON.stringify(payload));

      try {
        const resp = await fetch("/api/trading/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!resp.ok) throw new Error("Server-Speicherung fehlgeschlagen");
      } catch {
        /* optional */
      }
    } finally {
      setPending(false);
    }
  };

  const grouped = React.useMemo(() => {
    const list = lib?.items ?? [];
    return {
      A: list.filter(i => i.game === "A"),
      B: list.filter(i => i.game === "B"),
      C: list.filter(i => i.game === "C"),
    };
  }, [lib?.items]);

  return (
    <Card className="w-full max-w-full min-w-0 overflow-hidden">
      <CardHeader className="w-full max-w-full min-w-0">
        <div className="flex items-start sm:items-center justify-between gap-2 flex-wrap">
          <div className="min-w-0">
            <CardTitle className="truncate">Game Drillboard</CardTitle>
            <CardDescription className="truncate">
              Trainiere gezielt die schwächere Seite („back of the worm“). Erstelle Drills aus deiner Game Library oder füge eigene hinzu.
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 w-full max-w-full min-w-0">
        <div>
          <label className="text-sm">Titel</label>
          <Input value={title} onChange={e => setTitle(e.target.value)} className="w-full" />
        </div>

        <Separator />

        {/* Library-Auswahl – responsiv & ohne Overflow */}
        <div className="grid gap-4 md:grid-cols-3">
          {(["A", "B", "C"] as const).map((g) => (
            <div key={g} className="rounded-md border p-3 w-full max-w-full min-w-0">
              <div className="flex items-center justify-between gap-2">
                <div className="font-medium">{g}-Game Items</div>
                <Badge variant={gradeBadge(g)}>{grouped[g].length}</Badge>
              </div>
              <div className="mt-2 space-y-2 max-h-56 overflow-auto pr-1">
                {grouped[g].length === 0 && (
                  <div className="text-xs text-muted-foreground">Keine Items.</div>
                )}
                {grouped[g].map((it) => (
                  <div key={it._id} className="flex items-center justify-between gap-2 text-sm">
                    <div className="truncate min-w-0 flex-1 break-words">{it.label}</div>
                    <Button size="sm" variant="ghost" className="shrink-0 whitespace-nowrap" onClick={() => addFrom(it)}>
                      + Drill
                    </Button>
                  </div>
                ))}
              </div>
              <Button className="mt-3 w-full whitespace-nowrap" variant="secondary" onClick={() => addCustom(g)}>
                + Eigenen Drill
              </Button>
            </div>
          ))}
        </div>

        <Separator />

        {/* Drills-Liste – alle Reihen flex-wrap & min-w-0, Inputs truncaten sauber */}
        <div className="space-y-2">
          <div className="text-sm font-medium">Deine Drills</div>
          {drills.length === 0 && (
            <div className="text-sm text-muted-foreground">
              Noch keine Drills hinzugefügt.
            </div>
          )}
          <div className="grid gap-2">
            {drills.map((d) => {
              const pct = Math.max(0, Math.min(100, Math.round((d.repsDone / Math.max(1, d.repsTarget)) * 100)));
              return (
                <div key={d.id} className="rounded-md border p-3 w-full max-w-full min-w-0">
                  {/* Kopfzeile */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <Badge variant={gradeBadge(d.grade)} className="shrink-0">{d.grade}</Badge>
                      <Input
                        className="h-8 w-full min-w-0"
                        value={d.label}
                        onChange={(e) => updateDrill(d.id, { label: e.target.value })}
                        placeholder="Drill-Beschreibung (konkret/prüfbar)"
                      />
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Input
                        className="w-20 h-8"
                        type="number"
                        min={1}
                        value={d.repsTarget}
                        onChange={(e) =>
                          updateDrill(d.id, { repsTarget: Math.max(1, Number(e.target.value) || 1) })
                        }
                      />
                      <span className="text-xs text-muted-foreground whitespace-nowrap">Ziel</span>
                    </div>
                  </div>

                  {/* Progressbar – stabil & ohne Überlauf */}
                  <div className="mt-3 w-full">
                    <div className="w-full h-2 rounded-md overflow-hidden border bg-muted/40">
                      <div
                        className={`h-full ${barBgForGrade[d.grade]}`}
                        style={{ width: `${pct}%` }}
                        aria-label={`${pct}% erfüllt`}
                      />
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {d.repsDone}/{d.repsTarget} ({pct}%)
                    </div>
                  </div>

                  {/* Aktionen – darf umbrechen */}
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="ghost" onClick={() => inc(d.id, -1)}>-1</Button>
                      <Button size="sm" variant="secondary" onClick={() => inc(d.id, +1)}>+1</Button>
                      <div className="flex items-center gap-2 ml-1">
                        <Checkbox
                          checked={!!d.todayDone}
                          onCheckedChange={(v) => updateDrill(d.id, { todayDone: v === true })}
                          id={`today-${d.id}`}
                        />
                        <label htmlFor={`today-${d.id}`} className="text-xs">Heute erledigt</label>
                      </div>
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => removeDrill(d.id)} className="shrink-0">
                      Entfernen
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>

      <CardFooter className="flex flex-wrap items-center justify-end gap-2">
        <Button onClick={save} disabled={pending} className="whitespace-nowrap">
          {pending ? "Speichere…" : "Drillboard speichern"}
        </Button>
      </CardFooter>
    </Card>
  );
}
