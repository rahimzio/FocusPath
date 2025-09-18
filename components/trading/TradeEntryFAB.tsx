"use client";

import * as React from "react";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type Props = { userId: string };

type StrategyItem = {
  _id: string;
  name: string;
  count?: number;
  tag_color?: string; // z.B. "#10b981"
};

const fetcher = (url: string) => fetch(url).then((r) => r.json());

/** kleine Helper → gute Textfarbe zu hellem/dunklem Hintergrund */
function textColorForBg(hex?: string) {
  if (!hex) return undefined;
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!m) return undefined;
  const r = parseInt(m[1], 16);
  const g = parseInt(m[2], 16);
  const b = parseInt(m[3], 16);
  // relative luminance
  const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return lum > 0.6 ? "#111827" /* near black */ : "#ffffff";
}

export default function StrategyPills({ userId }: Props) {
  const { data, error, isLoading, mutate } = useSWR<StrategyItem[]>(
    userId ? `/api/trading/strategies?userId=${encodeURIComponent(userId)}` : null,
    fetcher
  );

  // aktuell ausgewählte Strategie aus URL ziehen
  const [selected, setSelected] = React.useState<string | null>(null);

  React.useEffect(() => {
    try {
      const url = new URL(window.location.href);
      const s = url.searchParams.get("strategy");
      setSelected(s || null);
    } catch {}
    // Wenn extern eine Strategie erstellt wird → neu laden
    const onCreated = () => mutate();
    window.addEventListener("strategy-created", onCreated as EventListener);
    return () => window.removeEventListener("strategy-created", onCreated as EventListener);
  }, [mutate]);

  // Strategy setzen → URL + Event für andere Komponenten
  const applyStrategy = React.useCallback((name: string | null) => {
    try {
      const url = new URL(window.location.href);
      if (name) url.searchParams.set("strategy", name);
      else url.searchParams.delete("strategy");
      window.history.replaceState({}, "", url.toString());
    } catch {}
    window.dispatchEvent(new CustomEvent("strategy-select", { detail: { name } }));
    setSelected(name);
  }, []);

  const onPick = (name: string) => {
    // toggle: gleicher Klick entfernt den Filter
    applyStrategy(selected === name ? null : name);
  };

  return (
    <Card className="w-full max-w-full min-w-0 overflow-hidden">
      <CardHeader className="flex items-center justify-between gap-2 flex-wrap min-w-0">
        <CardTitle className="truncate">Strategien</CardTitle>
        <div className="flex items-center gap-2">
          <Badge variant="outline">
            {Array.isArray(data) ? `${data.length} gespeichert` : "—"}
          </Badge>
          <Button
            size="sm"
            variant={selected ? "outline" : "default"}
            onClick={() => applyStrategy(null)}
            title="Alle Strategien anzeigen"
            aria-pressed={!selected}
          >
            Alle
          </Button>
        </div>
      </CardHeader>

      <CardContent className="min-w-0">
        {error && <div className="text-sm text-red-600">Strategien konnten nicht geladen werden.</div>}
        {isLoading && <div className="opacity-70 text-sm">Lade Strategien…</div>}

        <div className="flex gap-2 overflow-x-auto pb-1 min-w-0 w-full">
          {(data ?? []).map((s) => {
            const active = selected === s.name;
            const bg = active && s.tag_color ? s.tag_color : undefined;
            const color = bg ? textColorForBg(bg) : undefined;

            return (
              <Button
                key={s._id}
                type="button"
                size="sm"
                variant={active ? "default" : "outline"}
                style={active && bg ? { backgroundColor: bg, color, borderColor: bg } : undefined}
                onClick={() => onPick(s.name)}
                title={s.count ? `${s.name} (${s.count})` : s.name}
                className="shrink-0 whitespace-nowrap data-[pressed=true]:ring-2"
                data-pressed={active ? "true" : "false"}
                aria-pressed={active}
              >
                {s.name}
                {typeof s.count === "number" ? (
                  <span className="ml-2 text-xs opacity-80">({s.count})</span>
                ) : null}
              </Button>
            );
          })}

          {!isLoading && (!data || data.length === 0) && (
            <div className="opacity-60 text-sm">Noch keine Strategien gespeichert.</div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
