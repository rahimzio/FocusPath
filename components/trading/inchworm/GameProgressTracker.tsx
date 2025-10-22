"use client";

import * as React from "react";
import useSWR from "swr";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const fetcher = (url: string) => fetch(url).then(r => r.json());

export default function GameProgressTracker({ userId }: { userId: string }) {
  const key = React.useMemo(
    () => (userId ? `/api/trading/inchworm/progress?userId=${userId}` : null),
    [userId]
  );
  const { data, isLoading, error, mutate } = useSWR(key, fetcher, { revalidateOnFocus: false });

  // ⏱️ Sofort aktualisieren, wenn der Plan gespeichert wurde (CustomEvent + localStorage-Änderung)
  React.useEffect(() => {
    const onPlanEvent = () => mutate();
    const onStorage = (e: StorageEvent) => {
      if (!e.key) return;
      if (e.key.startsWith("inchworm:plan:")) mutate();
    };
    window.addEventListener("inchworm-plan-updated", onPlanEvent as any);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("inchworm-plan-updated", onPlanEvent as any);
      window.removeEventListener("storage", onStorage);
    };
  }, [mutate]);

  const periodLabel = React.useMemo(() => {
    const s = data?.period?.start;
    const e = data?.period?.end;
    if (s && e) return `${s} → ${e}`;
    return s || e || "—";
  }, [data?.period]);

  // kleine Helper, damit in der UI nichts knallt
  const hrA = Math.round(((data?.hitRate?.A ?? 0) * 100));
  const hrB = Math.round(((data?.hitRate?.B ?? 0) * 100));
  const hrC = Math.round(((data?.hitRate?.C ?? 0) * 100));

  const delta = (n?: number) => (Number.isFinite(Number(n)) ? Number(n) : 0);
  const badgeDelta = (v?: number) =>
    v == null ? null : (
      <span className={delta(v) > 0 ? "text-emerald-600 ml-2" : delta(v) < 0 ? "text-rose-600 ml-2" : "text-muted-foreground ml-2"}>
        {delta(v) > 0 ? "▲" : delta(v) < 0 ? "▼" : "•"} {delta(v)}
      </span>
    );

  return (
    <Card className="w-full max-w-full overflow-hidden">
      <CardHeader className="flex flex-col gap-1">
        <CardTitle>Game Progress</CardTitle>
        <div className="text-sm text-muted-foreground">
          Zeitraum: <span className="font-medium">{periodLabel}</span>
        </div>
      </CardHeader>

      <CardContent className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Plan vs Realität */}
        <div className="rounded-md border p-3">
          <div className="font-medium mb-2">Plan vs. Realität</div>

          {isLoading && <div className="opacity-70 text-sm">Lade…</div>}
          {error && <div className="text-red-600 text-sm">Fehler beim Laden.</div>}

          {!isLoading && !error && (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2 text-sm">
                <div className="flex items-center gap-2 min-w-0">
                  <Badge className="bg-emerald-600 text-white shrink-0">A</Badge>
                  <span className="truncate">Hit-Rate: {hrA}%</span>
                </div>
                <div className="flex items-center gap-2 min-w-0">
                  <Badge className="bg-amber-600 text-white shrink-0">B</Badge>
                  <span className="truncate">Hit-Rate: {hrB}%</span>
                </div>
                <div className="flex items-center gap-2 min-w-0">
                  <Badge className="border-rose-500 text-rose-600 shrink-0" variant="outline">C</Badge>
                  <span className="truncate">Hit-Rate: {hrC}%</span>
                </div>
              </div>

              <div className="text-xs text-muted-foreground">
                Hit-Rate = Anteil deiner Trades im Zeitraum, die mindestens einen <b>geplanten</b> Faktor der Kategorie enthalten.
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                <div className="rounded border p-2">
                  <div className="opacity-70">Ø Trades/Tag</div>
                  <div className="font-medium">
                    {data?.actual?.perDay ?? 0}
                    {badgeDelta(data?.deltaToTarget?.perDay)}
                  </div>
                </div>
                <div className="rounded border p-2">
                  <div className="opacity-70">Ø Trades/Woche</div>
                  <div className="font-medium">
                    {data?.actual?.perWeek ?? 0}
                    {badgeDelta(data?.deltaToTarget?.perWeek)}
                  </div>
                </div>
                <div className="rounded border p-2">
                  <div className="opacity-70">Ø Trades/Monat</div>
                  <div className="font-medium">
                    {data?.actual?.perMonth ?? 0}
                    {badgeDelta(data?.deltaToTarget?.perMonth)}
                  </div>
                </div>
              </div>

              <div className="text-xs opacity-70">
                Trades im Zeitraum: <b>{data?.totals?.trades ?? 0}</b>
              </div>
            </div>
          )}
        </div>

        {/* Platz für Add-ons (S-Quote, R:R-Zielerfüllung, Top geplante Faktoren, …) */}
        <div className="rounded-md border p-3">
          <div className="font-medium mb-2">Nächste Schritte</div>
          <ul className="list-disc pl-5 text-sm space-y-1">
            <li>S-Game-Quote (nur Trades, die ausschließlich A-Faktoren erfüllen).</li>
            <li>Standard-R:R gegen tatsächliche R:R-Kennzahl prüfen (falls vorhanden).</li>
            <li>Top geplante Faktoren (A/B/C) vs. tatsächliche Erfüllung je Faktor.</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
