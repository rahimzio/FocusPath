"use client";

import * as React from "react";
import useSWR from "swr";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

type TradeLite = {
  _id: string;
  userId: string;
  createdAt?: string;
  date?: string;
  gameComputed?: "A" | "B" | "C";
  gameCatalogGrade?: "A" | "B" | "C";
  status?: "final" | "draft";
};

type Bucket = { label: string; a: number; b: number; c: number; total: number };

const fetcher = async (url: string) => {
  const res = await fetch(url);
  let json: any = null;
  try { json = await res.json(); } catch {}
  if (!res.ok) return { items: [] };

  const items: TradeLite[] =
    (Array.isArray(json?.items) && json.items) ||
    (Array.isArray(json?.trades) && json.trades) ||
    (Array.isArray(json?.data) && json.data) ||
    [];

  return { items };
};

const monthBucket = (iso?: string) => {
  if (!iso) return "unknown";
  const d = new Date(iso);
  if (Number.isNaN(+d)) return "unknown";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

export default function GameProgressTracker({
  userId,
  months = 3,
}: {
  userId: string;
  months?: number;
}) {
  const key = React.useMemo(
    () => (userId ? `/api/trading/getRecent?userId=${userId}&limit=${Math.max(100, months * 120)}` : null),
    [userId, months]
  );
  const { data, error, isLoading } = useSWR<{ items: TradeLite[] }>(key, fetcher, { revalidateOnFocus: false });

  const buckets = React.useMemo<Bucket[]>(() => {
    const map = new Map<string, Bucket>();
    const trades = data?.items ?? [];
    for (const t of trades) {
      const label = monthBucket(t.date || t.createdAt);
      if (!map.has(label)) map.set(label, { label, a: 0, b: 0, c: 0, total: 0 });
      const b = map.get(label)!;
      const g = (t.gameCatalogGrade || t.gameComputed || "C") as "A" | "B" | "C";
      if (g === "A") b.a += 1;
      else if (g === "B") b.b += 1;
      else b.c += 1;
      b.total += 1;
    }
    return Array.from(map.values()).sort((x, y) => x.label.localeCompare(y.label)).slice(-months);
  }, [data?.items, months]);

  return (
    <Card className="w-full max-w-full min-w-0 overflow-hidden">
      <CardHeader className="w-full max-w-full min-w-0">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="min-w-0">
            <CardTitle className="truncate">Game Progress (Monate)</CardTitle>
            <CardDescription className="truncate">
              Verteilung A/B/C nach Monaten – Trend deiner Ausführung.
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3 w-full max-w-full min-w-0">
        {error && <div className="text-red-600">Fehler beim Laden.</div>}
        {isLoading && <div className="opacity-70">Lade…</div>}
        {!isLoading && !error && buckets.length === 0 && (
          <div className="text-sm text-muted-foreground">Noch keine Trades vorhanden.</div>
        )}

        {buckets.map((b) => {
          const total = Math.max(1, b.total);
          const pa = Math.round((b.a / total) * 100);
          const pb = Math.round((b.b / total) * 100);
          const pc = Math.max(0, 100 - pa - pb);

          return (
            <div key={b.label} className="rounded-md border p-3 w-full max-w-full min-w-0">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="font-medium">{b.label}</div>
                <div className="flex items-center gap-2 text-xs">
                  <Badge className="bg-emerald-600 text-white">A {b.a}</Badge>
                  <Badge className="bg-amber-600 text-white">B {b.b}</Badge>
                  <Badge variant="outline" className="border-rose-500 text-rose-600">C {b.c}</Badge>
                </div>
              </div>

              <div className="mt-3 w-full h-3 rounded-md overflow-hidden border bg-muted/40">
                <div className="flex h-full w-full">
                  <div className="h-full bg-emerald-500" style={{ width: `${pa}%` }} aria-label={`A ${pa}%`} />
                  <div className="h-full bg-amber-500" style={{ width: `${pb}%` }} aria-label={`B ${pb}%`} />
                  <div className="h-full bg-rose-500" style={{ width: `${pc}%` }} aria-label={`C ${pc}%`} />
                </div>
              </div>

              <div className="mt-2 text-xs text-muted-foreground">
                Anteil: A {pa}% • B {pb}% • C {pc}%
              </div>
            </div>
          );
        })}

        <Separator />
        <div className="text-xs text-muted-foreground break-words">
          Hinweis: Es wird zuerst <code>gameCatalogGrade</code>, sonst <code>gameComputed</code> verwendet.
        </div>
      </CardContent>
    </Card>
  );
}
