// components/GamePicker.tsx
"use client";

import * as React from "react";
import useSWR from "swr";
import {
  Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";

type Props = { userId: string };
type Game      = "S" | "A" | "B" | "C";        // ⚡︎ erweitert um S
type ItemGrade = "A" | "B" | "C";              // Library-Items bleiben A/B/C

type LibraryItem = {
  _id: string;
  userId: string;
  label: string;
  game: ItemGrade;
  points: number;
  active: boolean;
  tags?: string[];
  createdAt?: string;
  updatedAt?: string;
};

const fetcher = (url: string) => fetch(url).then(r => r.json());

// Basis: Ø-Punkte → A/B/C
function gradeFromAvg(avg: number): Exclude<Game, "S"> {
  if (avg >= 2.5) return "A";
  if (avg >= 1.5) return "B";
  return "C";
}

// UI-Event aussenden (z.B. für Dashboard/Badges)
function dispatchChange(payload: { selectedIds: string[]; avgPoints: number; grade: Game }) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("game-picker-change", { detail: payload }));
  }
}

function badgeTone(g: Game) {
  // S ist purple
  if (g === "S") return "bg-purple-600 text-white";
  if (g === "A") return "bg-emerald-600 text-white";
  if (g === "B") return "bg-amber-600 text-white";
  return "bg-rose-600 text-white";
}

export default function GamePicker({
  userId, value, onChange, autoDispatch = true,
}: {
  userId: string;
  value?: string[];
  onChange?: (v: { selectedIds: string[]; avgPoints: number; grade: Game }) => void;
  autoDispatch?: boolean;
}) {
  const [q, setQ] = React.useState("");
  const [selected, setSelected] = React.useState<Set<string>>(new Set(value ?? []));

  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<LibraryItem | null>(null);
  const [draft, setDraft] = React.useState<{
    label: string; tagsText: string; points: string; active: boolean; game: ItemGrade;
  } | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [removing, setRemoving] = React.useState(false);

  const key = React.useMemo(() => {
    if (!userId) return null;
    const p = new URLSearchParams({ userId, active: "true", limit: "500" });
    if (q.trim()) p.set("q", q.trim());
    return `/api/trading/gameLibrary?${p.toString()}`;
  }, [userId, q]);

  // etwas snappier
  const { data, error, isLoading, mutate } = useSWR<{ items: LibraryItem[] }>(key, fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    revalidateIfStale: false,
    dedupingInterval: 60_000,
    keepPreviousData: true,
  });

  React.useEffect(() => {
    if (value) setSelected(new Set(value));
  }, [value?.join("|")]);

  const items = (data?.items ?? []).filter(it => it.active !== false);

  const itemsByGame: Record<ItemGrade, LibraryItem[]> = React.useMemo(() => ({
    A: items.filter(i => i.game === "A"),
    B: items.filter(i => i.game === "B"),
    C: items.filter(i => i.game === "C"),
  }), [items]);

  const pointsMap = React.useMemo(() => {
    const m = new Map<string, number>();
    for (const it of items) {
      m.set(it._id, Number(it.points ?? (it.game === "A" ? 3 : it.game === "B" ? 2 : 1)));
    }
    return m;
  }, [items]);

  // 🔑 Map: ItemId → ItemGrade (für S-Regel)
  const gradeMap = React.useMemo(() => {
    const m = new Map<string, ItemGrade>();
    for (const it of items) m.set(it._id, it.game);
    return m;
  }, [items]);

  const selectedIds = React.useMemo(() => Array.from(selected), [selected]);

  const avgPoints = React.useMemo(() => {
    if (selected.size === 0) return 0;
    let sum = 0;
    for (const id of selected) sum += pointsMap.get(id) ?? 0;
    return sum / selected.size;
  }, [selected, pointsMap]);

  // ⚡️ S-Logik: mind. 3 A, KEIN B/C
  const isS = React.useMemo(() => {
    if (selected.size < 3) return false;
    let aCount = 0;
    for (const id of selected) {
      const g = gradeMap.get(id);
      if (g === "A") aCount += 1;
      else if (g === "B" || g === "C") return false; // sofort raus
    }
    return aCount >= 3;
  }, [selected, gradeMap]);

  const baseGrade = React.useMemo(() => gradeFromAvg(avgPoints), [avgPoints]);
  const grade: Game = isS ? "S" : baseGrade;

  // propagate
  React.useEffect(() => {
    const payload = { selectedIds, avgPoints, grade };
    onChange?.(payload);
    if (autoDispatch) dispatchChange(payload);
  }, [selectedIds.join("|"), avgPoints, grade]);

  const toggle = (id: string, on?: boolean) => {
    setSelected(prev => {
      const next = new Set(prev);
      const shouldAdd = on ?? !prev.has(id);
      if (shouldAdd) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const clearAll = () => setSelected(new Set());
  const selectAllOf = (g: ItemGrade) => {
    setSelected(prev => {
      const next = new Set(prev);
      for (const it of itemsByGame[g]) next.add(it._id);
      return next;
    });
  };

  const openDetails = (it: LibraryItem) => {
    setEditing(it);
    setDraft({
      label: it.label ?? "",
      tagsText: (it.tags ?? []).join(", "),
      points: String(it.points ?? (it.game === "A" ? 3 : it.game === "B" ? 2 : 1)),
      active: it.active !== false,
      game: it.game,
    });
    setOpen(true);
  };

  const saveChanges = async () => {
    if (!editing || !draft) return;
    setSaving(true);
    try {
      const payload: any = {
        label: draft.label.trim(),
        points: Number(draft.points),
        active: !!draft.active,
        game: draft.game,
        tags: draft.tagsText.split(",").map(s => s.trim()).filter(Boolean),
      };
      const resp = await fetch(`/api/trading/gameLibrary?id=${editing._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!resp.ok) throw new Error(`PATCH failed: ${resp.status}`);
      await mutate();
      setOpen(false);
      setEditing(null);
      setDraft(null);
    } catch (e) {
      console.error(e);
      alert("Speichern fehlgeschlagen.");
    } finally {
      setSaving(false);
    }
  };

  const deleteItem = async () => {
    if (!editing) return;
    if (!confirm("Diesen Game-Faktor wirklich löschen?")) return;
    setRemoving(true);
    try {
      const resp = await fetch(`/api/trading/gameLibrary?id=${editing._id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      });
      if (!resp.ok) throw new Error(`DELETE failed: ${resp.status}`);
      await mutate();
      setOpen(false);
      setEditing(null);
      setDraft(null);
    } catch (e) {
      console.error(e);
      alert("Löschen fehlgeschlagen.");
    } finally {
      setRemoving(false);
    }
  };

  return (
    <>
      <Card className="w-full max-w-full min-w-0 overflow-hidden break-words">
        <CardHeader className="gap-3 w-full max-w-full min-w-0 overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 min-w-0">
            <div className="min-w-0">
              <CardTitle className="truncate">S/A/B/C Game – Auswahl</CardTitle>
              <CardDescription className="truncate">
                Hake Punkte an, die du in diesem Trade erfüllt hast. Klick auf einen Punkt → Details & Bearbeiten.
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2 min-w-0">
              <Badge className={cn("h-6 px-2 text-xs", badgeTone(grade))}>
                Grade: {grade}
              </Badge>
              <Badge className="h-6 px-2 text-xs" variant="outline">Ø Punkte: {avgPoints.toFixed(2)}</Badge>
              <Button size="sm" variant="outline" onClick={clearAll} className="whitespace-nowrap">
                Zurücksetzen
              </Button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 min-w-0">
            <Input
              placeholder="Suchen (Label, Tags)…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="w-full sm:max-w-sm"
            />
            <div className="hidden sm:flex items-center gap-2 flex-wrap">
              <Button size="sm" variant="ghost" onClick={() => selectAllOf("A")}>Alle A</Button>
              <Button size="sm" variant="ghost" onClick={() => selectAllOf("B")}>Alle B</Button>
              <Button size="sm" variant="ghost" onClick={() => selectAllOf("C")}>Alle C</Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4 min-w-0">
          {(["A", "B", "C"] as ItemGrade[]).map((g) => (
            <div key={g} className="rounded-md border p-3 w-full max-w-full min-w-0 overflow-hidden">
              <div className="flex items-center justify-between gap-2">
                <div className="font-medium">Kategorie {g}</div>
                <Badge className="h-6 px-2 text-xs" variant={g === "A" ? "default" : g === "B" ? "secondary" : "outline"}>
                  {g === "A" ? "3 Punkte" : g === "B" ? "2 Punkte" : "1 Punkt"}
                </Badge>
              </div>
              <Separator className="my-2" />
              <div className="flex flex-col gap-2 min-w-0">
                {itemsByGame[g].length === 0 && (
                  <div className="text-sm text-muted-foreground">Keine Einträge.</div>
                )}
                {itemsByGame[g].map((it) => {
                  const checked = selected.has(it._id);
                  return (
                    <div
                      key={it._id}
                      className={cn(
                        "flex items-start gap-2 rounded-md p-2 border cursor-pointer w-full max-w-full min-w-0",
                        checked ? "bg-muted/50 border-primary/40" : "hover:bg-muted/30"
                      )}
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); openDetails(it); }}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openDetails(it); }
                      }}
                    >
                      <div onClick={(e) => e.stopPropagation()} className="pt-0.5 shrink-0">
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(v) => toggle(it._id, v === true)}
                        />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="font-medium leading-tight truncate">{it.label}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {it.tags?.length ? it.tags.join(", ") : "—"}
                        </div>
                      </div>

                      <div className="ml-auto pl-2 shrink-0">
                        <Badge className="h-5 px-2 text-[11px]" variant="outline">+{it.points}</Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </CardContent>

        <CardFooter className="flex flex-col sm:flex-row gap-2 sm:items-center justify-between">
          <div className="text-sm text-muted-foreground">
            {selected.size} ausgewählt
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge className={cn("h-6 px-2 text-xs", badgeTone(grade))}>
              Grade: {grade}
            </Badge>
            <Badge className="h-6 px-2 text-xs" variant="outline">Ø {avgPoints.toFixed(2)} Punkte</Badge>
          </div>
        </CardFooter>

        {error && <div className="text-red-600 px-4 pb-3">Fehler beim Laden.</div>}
        {isLoading && <div className="opacity-70 px-4 pb-3">Lade…</div>}
      </Card>

      {/* Detail / Edit Dialog */}
      <Dialog open={open} onOpenChange={(o) => { if (!o) { setOpen(false); setEditing(null); setDraft(null); } }}>
        <DialogContent className="w-[95vw] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Game-Faktor bearbeiten</DialogTitle>
            <DialogDescription>
              Passe Label, Kategorie, Punkte oder Tags an. Speichern aktualisiert den Eintrag in deiner Library.
            </DialogDescription>
          </DialogHeader>

          {editing && draft ? (
            <div className="grid gap-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <div className="text-xs font-medium mb-1">Label</div>
                  <Input
                    value={draft.label}
                    onChange={(e) => setDraft({ ...draft, label: e.target.value })}
                    placeholder="z. B. Plan befolgt"
                    className="w-full"
                  />
                </div>
                <div>
                  <div className="text-xs font-medium mb-1">Kategorie</div>
                  <Select
                    value={draft.game}
                    onValueChange={(v) => setDraft({ ...draft, game: v as ItemGrade })}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="A/B/C" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="A">A (3 Punkte)</SelectItem>
                      <SelectItem value="B">B (2 Punkte)</SelectItem>
                      <SelectItem value="C">C (1 Punkt)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <div className="text-xs font-medium mb-1">Punkte</div>
                  <Input
                    type="number"
                    inputMode="decimal"
                    value={draft.points}
                    onChange={(e) => setDraft({ ...draft, points: e.target.value })}
                    placeholder="1, 2 oder 3"
                    className="w-full"
                  />
                </div>
                <div className="flex items-center gap-2 mt-1 md:mt-8">
                  <Checkbox
                    checked={draft.active}
                    onCheckedChange={(v) => setDraft({ ...draft, active: v === true })}
                  />
                  <span className="text-sm">Aktiv</span>
                </div>
              </div>

              <div>
                <div className="text-xs font-medium mb-1">Tags (kommagetrennt)</div>
                <Input
                  value={draft.tagsText}
                  onChange={(e) => setDraft({ ...draft, tagsText: e.target.value })}
                  placeholder="Disziplin, Setup, R:R"
                  className="w-full"
                />
              </div>

              <div className="text-xs text-muted-foreground">
                Erstellt: {editing.createdAt ? new Date(editing.createdAt).toLocaleString() : "—"} •&nbsp;
                Geändert: {editing.updatedAt ? new Date(editing.updatedAt).toLocaleString() : "—"}
              </div>
            </div>
          ) : null}

          <DialogFooter className="flex items-center justify-between flex-wrap gap-2">
            <Button variant="destructive" onClick={deleteItem} disabled={removing || saving}>
              {removing ? "Lösche…" : "Löschen"}
            </Button>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => { setOpen(false); setEditing(null); setDraft(null); }} disabled={saving || removing}>
                Abbrechen
              </Button>
              <Button onClick={saveChanges} disabled={saving || removing}>
                {saving ? "Speichere…" : "Speichern"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
