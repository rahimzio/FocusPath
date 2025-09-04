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

type Props = { userId: string | any };

type Game = "A" | "B" | "C";
type LibraryItem = {
  _id: string;
  userId: string;
  label: string;
  game: Game;
  points: number;    // A=3, B=2, C=1 (Standard, in API überschreibbar)
  active: boolean;
  tags?: string[];
};

const fetcher = (url: string) => fetch(url).then(r => r.json());

/** Aus Durchschnitts-Punkten (1..3) ein Grade ableiten */
function gradeFromAvg(avg: number): Game {
  if (avg >= 2.5) return "A";
  if (avg >= 1.5) return "B";
  return "C";
}

/** CustomEvent an die Außenwelt (z. B. TradeEntryForm) senden */
function dispatchChange(payload: { selectedIds: string[]; avgPoints: number; grade: Game }) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("game-picker-change", { detail: payload }));
  }
}

export default function GamePicker({
  userId,
  value,
  onChange,
  autoDispatch = true,
}: {
  userId: string|any;
  /** optional: kontrollierter Modus */
  value?: string[];
  /** optional: Callback bei Änderungen */
  onChange?: (v: { selectedIds: string[]; avgPoints: number; grade: Game }) => void;
  /** ob ein Window-Event gefeuert werden soll (default: true) */
  autoDispatch?: boolean;
}) {
  const [q, setQ] = React.useState("");
  const [selected, setSelected] = React.useState<Set<string>>(new Set(value ?? []));

  // SWR-Key: nur aktive Items, paginiert groß genug (kannst du später cursorn)
  const key = React.useMemo(() => {
    if (!userId) return null;
    const p = new URLSearchParams({ userId, active: "true", limit: "500" });
    if (q.trim()) p.set("q", q.trim());
    return `/api/trading/gameLibrary?${p.toString()}`;
  }, [userId, q]);

  const { data, error, isLoading, mutate } = useSWR<{ items: LibraryItem[] }>(key, fetcher);

  // wenn kontrolliert: externen value -> internen Selected-Set spiegeln
  React.useEffect(() => {
    if (value) setSelected(new Set(value));
  }, [value?.join("|")]);

  const items = (data?.items ?? []).filter(it => it.active !== false);
  const itemsByGame: Record<Game, LibraryItem[]> = React.useMemo(() => ({
    A: items.filter(i => i.game === "A"),
    B: items.filter(i => i.game === "B"),
    C: items.filter(i => i.game === "C"),
  }), [items]);

  const pointsMap = React.useMemo(() => {
    const m = new Map<string, number>();
    for (const it of items) m.set(it._id, Number(it.points ?? (it.game === "A" ? 3 : it.game === "B" ? 2 : 1)));
    return m;
  }, [items]);

  const selectedIds = React.useMemo(() => Array.from(selected), [selected]);
  const avgPoints = React.useMemo(() => {
    if (selected.size === 0) return 0;
    let sum = 0;
    for (const id of selected) sum += pointsMap.get(id) ?? 0;
    return sum / selected.size;
  }, [selected, pointsMap]);
  const grade = React.useMemo(() => gradeFromAvg(avgPoints), [avgPoints]);

  // Änderungen nach außen geben
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
  const selectAllOf = (g: Game) => {
    setSelected(prev => {
      const next = new Set(prev);
      for (const it of itemsByGame[g]) next.add(it._id);
      return next;
    });
  };

  return (
    <Card className="w-full">
      <CardHeader className="gap-2">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div>
            <CardTitle>A/B/C Game – Auswahl</CardTitle>
            <CardDescription>Hake Punkte an, die du in diesem Trade erfüllt hast. Daraus wird ein Score & Grade berechnet.</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={grade === "A" ? "default" : grade === "B" ? "secondary" : "outline"}>
              Grade: {grade}
            </Badge>
            <Badge variant="outline">Ø Punkte: {avgPoints.toFixed(2)}</Badge>
            <Button variant="outline" onClick={clearAll}>Zurücksetzen</Button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Input
            placeholder="Suchen (Label, Tags)…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="max-w-sm"
          />
          <div className="hidden sm:flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => selectAllOf("A")}>Alle A</Button>
            <Button variant="ghost" size="sm" onClick={() => selectAllOf("B")}>Alle B</Button>
            <Button variant="ghost" size="sm" onClick={() => selectAllOf("C")}>Alle C</Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {(["A", "B", "C"] as Game[]).map((g) => (
          <div key={g} className="rounded-md border p-3">
            <div className="flex items-center justify-between">
              <div className="font-medium">Kategorie {g}</div>
              <Badge variant={g === "A" ? "default" : g === "B" ? "secondary" : "outline"}>
                {g === "A" ? "3 Punkte" : g === "B" ? "2 Punkte" : "1 Punkt"}
              </Badge>
            </div>
            <Separator className="my-2" />
            <div className="flex flex-col gap-2">
              {itemsByGame[g].length === 0 && (
                <div className="text-sm text-muted-foreground">Keine Einträge.</div>
              )}
              {itemsByGame[g].map((it) => {
                const checked = selected.has(it._id);
                return (
                  <label key={it._id} className={cn(
                    "flex items-start gap-2 rounded-md p-2 border",
                    checked ? "bg-muted/50 border-primary/40" : "hover:bg-muted/30"
                  )}>
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(v) => toggle(it._id, v === true)}
                    />
                    <div className="min-w-0">
                      <div className="font-medium leading-tight truncate">{it.label}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {it.tags?.length ? it.tags.join(", ") : "—"}
                      </div>
                    </div>
                    <div className="ml-auto pl-2">
                      <Badge variant="outline">+{it.points}</Badge>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>
        ))}
      </CardContent>

      <CardFooter className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {selected.size} ausgewählt
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={grade === "A" ? "default" : grade === "B" ? "secondary" : "outline"}>
            Grade: {grade}
          </Badge>
          <Badge variant="outline">Ø {avgPoints.toFixed(2)} Punkte</Badge>
        </div>
      </CardFooter>

      {error && <div className="text-red-600 px-4 pb-3">Fehler beim Laden.</div>}
      {isLoading && <div className="opacity-70 px-4 pb-3">Lade…</div>}
    </Card>
  );
}
