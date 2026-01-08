"use client";

import * as React from "react";
import useSWR from "swr";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const fetcher = async (url: string) => {
  const r = await fetch(url);
  if (!r.ok) {
    const txt = await r.text().catch(() => "");
    throw new Error(txt || "Failed to fetch");
  }
  return r.json();
};

function toText(v: any) {
  if (v == null) return "";
  if (typeof v === "string") return v;
  if (typeof v === "number") return String(v);
  if (typeof v === "boolean") return v ? "true" : "false";
  // never render objects directly
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

function formatPeriodLabel(data: any) {
  // NEW preferred shape: range { from, to }
  const from = data?.range?.from;
  const to = data?.range?.to;
  if (typeof from === "string" && typeof to === "string") return `${from} → ${to}`;

  // legacy shape: period { start, end } or strings
  const s = data?.period?.start ?? data?.periodStart ?? data?.period?.from;
  const e = data?.period?.end ?? data?.periodEnd ?? data?.period?.to;
  if (typeof s === "string" && typeof e === "string") return `${s} → ${e}`;
  if (typeof s === "string") return s;
  if (typeof e === "string") return e;

  // fallback: avoid rendering object
  const raw = data?.period;
  if (typeof raw === "string") return raw;
  return "—";
}

export default function GameProgressPlanAware({ userId }: { userId: string }) {
  // ✅ new endpoint
  const key = React.useMemo(() => {
    if (!userId) return null;
    const p = new URLSearchParams();
    p.set("userId", userId);
    p.set("period", "prev_month"); // default like overview
    p.set("scope", "all"); // trade + executed setups + reflections
    return `/api/trading/improve/progress?${p.toString()}`;
  }, [userId]);

  const { data, isLoading, error, mutate } = useSWR<any>(key, fetcher, {
    revalidateOnFocus: false,
  });

  // ✅ refresh when plan changes anywhere
  React.useEffect(() => {
    const onPlanEvent = () => mutate();
    window.addEventListener("inchworm-plan-updated", onPlanEvent as any);
    window.addEventListener("game-library-updated", onPlanEvent as any);
    return () => {
      window.removeEventListener("inchworm-plan-updated", onPlanEvent as any);
      window.removeEventListener("game-library-updated", onPlanEvent as any);
    };
  }, [mutate]);

  const periodLabel = React.useMemo(() => formatPeriodLabel(data), [data]);

  const pct = (x?: number) => Math.round(((typeof x === "number" ? x : 0) || 0) * 100);
  const hrA = pct(data?.hitRate?.A);
  const hrB = pct(data?.hitRate?.B);
  const hrC = pct(data?.hitRate?.C);

  const safeNum = (n?: number) => (Number.isFinite(Number(n)) ? Number(n) : 0);

  const Delta = ({ v }: { v?: number }) => {
    if (v == null) return null;
    const n = safeNum(v);
    return (
      <span
        className={
          n > 0
            ? "text-emerald-600 ml-2"
            : n < 0
              ? "text-rose-600 ml-2"
              : "text-muted-foreground ml-2"
        }
      >
        {n > 0 ? "▲" : n < 0 ? "▼" : "•"} {n}
      </span>
    );
  };

  return (
    <Card className="w-full max-w-full overflow-hidden">
      <CardHeader className="flex flex-col gap-1">
        <CardTitle>Game Progress</CardTitle>

        <div className="text-sm text-muted-foreground">
          Zeitraum: <span className="font-medium">{periodLabel}</span>
        </div>

        {/* totals: never render objects */}
        <div className="text-xs text-muted-foreground">
          Trades: <b>{toText(data?.totals?.trades ?? 0)}</b> · Exec Setups:{" "}
          <b>{toText(data?.totals?.executedSetups ?? 0)}</b> · Reflections:{" "}
          <b>{toText(data?.totals?.dayReflections ?? 0)}</b>
        </div>
      </CardHeader>

      <CardContent className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-md border p-3">
          <div className="font-medium mb-2">Plan vs. Realität</div>

          {isLoading ? <div className="opacity-70 text-sm">Lade…</div> : null}
          {error ? <div className="text-red-600 text-sm">Fehler beim Laden.</div> : null}

          {!isLoading && !error ? (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2 text-sm">
                <div className="flex items-center gap-2 min-w-0">
                  <Badge className="shrink-0">A</Badge>
                  <span className="truncate">Hit-Rate: {hrA}%</span>
                </div>
                <div className="flex items-center gap-2 min-w-0">
                  <Badge variant="secondary" className="shrink-0">
                    B
                  </Badge>
                  <span className="truncate">Hit-Rate: {hrB}%</span>
                </div>
                <div className="flex items-center gap-2 min-w-0">
                  <Badge variant="outline" className="shrink-0">
                    C
                  </Badge>
                  <span className="truncate">Hit-Rate: {hrC}%</span>
                </div>
              </div>

              <div className="text-xs text-muted-foreground">
                Hit-Rate = Anteil deiner Einträge im Zeitraum, die mindestens einen geplanten Faktor der Kategorie enthalten.
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                <div className="rounded border p-2">
                  <div className="opacity-70">Ø / Tag</div>
                  <div className="font-medium">
                    {toText(data?.actual?.perDay ?? 0)}
                    <Delta v={data?.deltaToTarget?.perDay} />
                  </div>
                </div>
                <div className="rounded border p-2">
                  <div className="opacity-70">Ø / Woche</div>
                  <div className="font-medium">
                    {toText(data?.actual?.perWeek ?? 0)}
                    <Delta v={data?.deltaToTarget?.perWeek} />
                  </div>
                </div>
                <div className="rounded border p-2">
                  <div className="opacity-70">Ø / Monat</div>
                  <div className="font-medium">
                    {toText(data?.actual?.perMonth ?? 0)}
                    <Delta v={data?.deltaToTarget?.perMonth} />
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        <div className="rounded-md border p-3">
          <div className="font-medium mb-2">Nächste Schritte</div>
          <ul className="list-disc pl-5 text-sm space-y-1">
            <li>Optional: S-Game Quote.</li>
            <li>Optional: Faktor-Details pro Item (Top planned vs hit).</li>
            <li>Optional: separate Tabs trade/setup/reflection.</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
