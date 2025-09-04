"use client";

import * as React from "react";
import useSWR from "swr";
import { useFormContext } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

type Grade = "A" | "B" | "C";
type GameItem = {
  _id: string;
  userId?: string | null;
  label: string;
  grade: Grade;         // Kategorie A/B/C
  score?: number;       // optional: Punkte; Fallback folgt aus grade
  active?: boolean;
};

const fetcher = (url: string) => fetch(url).then((r) => r.json());

// Fallback-Punkte je Grade, wenn ein Item kein score gesetzt hat
const DEFAULT_POINTS: Record<Grade, number> = { A: 3, B: 2, C: 1 };

function gradeColor(g: Grade) {
  return g === "A" ? "bg-emerald-600" : g === "B" ? "bg-amber-600" : "bg-rose-600";
}
function gradeFromAverage(avg: number): Grade {
  // 3=A, 2=B, 1=C → Schwellen 2.5 / 1.5
  if (avg >= 2.5) return "A";
  if (avg >= 1.5) return "B";
  return "C";
}

export default function TEFGameCatalog({
  userId,
  fieldName = "gameItems",          // string[] der ausgewählten Item-IDs
  scoreField = "gameCatalogScore",  // number: Ø-Punkte (Durchschnitt)
  gradeField = "gameCatalogGrade",  // "A" | "B" | "C" aus Ø-Punkten
  className,
}: {
  userId: string;
  fieldName?: string;
  scoreField?: string;
  gradeField?: string;
  className?: string;
}) {
  const { data, error, isLoading } = useSWR<{ items: GameItem[] }>(
    userId ? `/api/trading/game-catalog?userId=${encodeURIComponent(userId)}&includeGlobal=true` : null,
    fetcher
  );

  const { watch, setValue } = useFormContext<any>();
  const selected: string[] = watch(fieldName) ?? [];

  const [q, setQ] = React.useState("");

  // Nur aktive Items verwenden
  const items = React.useMemo<GameItem[]>(
    () => (data?.items ?? []).filter((it) => it.active !== false),
    [data?.items]
  );

  const mapById = React.useMemo(() => {
    const m = new Map<string, GameItem>();
    items.forEach((it) => m.set(String(it._id), it));
    return m;
  }, [items]);

  const filtered = React.useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return items;
    return items.filter((it) => it.label.toLowerCase().includes(s));
  }, [items, q]);

  const groups = React.useMemo(() => {
    const A: GameItem[] = [];
    const B: GameItem[] = [];
    const C: GameItem[] = [];
    for (const it of filtered) {
      if (it.grade === "A") A.push(it);
      else if (it.grade === "B") B.push(it);
      else C.push(it);
    }
    return { A, B, C };
  }, [filtered]);

  const stats = React.useMemo(() => {
    let total = 0;
    for (const id of selected) {
      const it = mapById.get(id);
      if (!it) continue;
      const pts = Number.isFinite(it.score as number) ? (it.score as number) : DEFAULT_POINTS[it.grade];
      total += pts;
    }
    const cnt = selected.length;
    const avg = cnt > 0 ? total / cnt : 0;
    const avgRounded = Math.round(avg * 100) / 100;
    const g = gradeFromAverage(avg);
    return { total, cnt, avg: avgRounded, g };
  }, [selected, mapById]);

  // Ø-Score + Grade in RHF schreiben, wenn Auswahl sich ändert
  React.useEffect(() => {
    setValue(scoreField, stats.avg, { shouldDirty: true, shouldTouch: false });
    setValue(gradeField, stats.g, { shouldDirty: true, shouldTouch: false });
  }, [stats.avg, stats.g, setValue, scoreField, gradeField]);

  const toggle = (id: string, checked: boolean) => {
    const set = new Set(selected);
    if (checked) set.add(id);
    else set.delete(id);
    setValue(fieldName, Array.from(set), { shouldDirty: true });
  };

  const clearAll = () => setValue(fieldName, [], { shouldDirty: true });

  if (error) return <div className="text-red-600">Game-Katalog konnte nicht geladen werden.</div>;

  return (
    <div className={className}>
      {/* Kopfzeile */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="font-medium">Game-Katalog</span>
          <Badge variant="outline" title="Ausgewählte Items">
            {stats.cnt} ausgewählt
          </Badge>
          <Badge variant="outline" title="Ø-Punkte (Durchschnitt)">
            Ø-Score: {stats.avg}
          </Badge>
          <Badge variant="outline" title="Summe der Punkte">
            Summe: {stats.total}
          </Badge>
          <Badge className={`text-white ${gradeColor(stats.g)}`} title="Berechnete Game-Stufe">
            {stats.g}-Game
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Suche im Katalog…"
            className="w-[220px]"
          />
          <Button type="button" variant="outline" onClick={clearAll} disabled={selected.length === 0}>
            Auswahl löschen
          </Button>
        </div>
      </div>

      <Separator className="my-3" />

      {/* Liste (scrollbar ohne ScrollArea-Dependency) */}
      <div className="max-h-[340px] overflow-y-auto pr-1 space-y-5">
        {/* Gruppe A */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold">A-Items</span>
              <Badge className="bg-emerald-600 text-white">{groups.A.length}</Badge>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {groups.A.map((it) => {
              const checked = selected.includes(it._id);
              const pts = Number.isFinite(it.score as number) ? (it.score as number) : DEFAULT_POINTS[it.grade];
              return (
                <label key={it._id} className="flex items-center gap-2 rounded border p-2">
                  <Checkbox checked={checked} onCheckedChange={(c) => toggle(it._id, c === true)} />
                  <span className="text-sm">{it.label}</span>
                  <Badge className="ml-auto" variant="secondary">+{pts}</Badge>
                </label>
              );
            })}
            {groups.A.length === 0 && <div className="text-xs opacity-60">Keine A-Items.</div>}
          </div>
        </div>

        {/* Gruppe B */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold">B-Items</span>
              <Badge className="bg-amber-600 text-white">{groups.B.length}</Badge>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {groups.B.map((it) => {
              const checked = selected.includes(it._id);
              const pts = Number.isFinite(it.score as number) ? (it.score as number) : DEFAULT_POINTS[it.grade];
              return (
                <label key={it._id} className="flex items-center gap-2 rounded border p-2">
                  <Checkbox checked={checked} onCheckedChange={(c) => toggle(it._id, c === true)} />
                  <span className="text-sm">{it.label}</span>
                  <Badge className="ml-auto" variant="secondary">+{pts}</Badge>
                </label>
              );
            })}
            {groups.B.length === 0 && <div className="text-xs opacity-60">Keine B-Items.</div>}
          </div>
        </div>

        {/* Gruppe C */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold">C-Items</span>
              <Badge className="bg-rose-600 text-white">{groups.C.length}</Badge>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {groups.C.map((it) => {
              const checked = selected.includes(it._id);
              const pts = Number.isFinite(it.score as number) ? (it.score as number) : DEFAULT_POINTS[it.grade];
              return (
                <label key={it._id} className="flex items-center gap-2 rounded border p-2">
                  <Checkbox checked={checked} onCheckedChange={(c) => toggle(it._id, c === true)} />
                  <span className="text-sm">{it.label}</span>
                  <Badge className="ml-auto" variant="secondary">+{pts}</Badge>
                </label>
              );
            })}
            {groups.C.length === 0 && <div className="text-xs opacity-60">Keine C-Items.</div>}
          </div>
        </div>
      </div>

      {isLoading && <div className="opacity-60 mt-2 text-sm">Lade Game-Items…</div>}
      {!isLoading && items.length === 0 && (
        <div className="opacity-70 mt-2 text-sm">
          Keine Game-Items vorhanden. (Optional: Presets per GET&nbsp;…/game-catalog?seed=true anlegen)
        </div>
      )}
    </div>
  );
}
