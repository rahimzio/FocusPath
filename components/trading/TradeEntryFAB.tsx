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
  tag_color?: string;
};

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function StrategyPills({ userId }: Props) {
  const { data, error, isLoading } = useSWR<StrategyItem[]>(
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
  }, []);

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
    <Card>
      <CardHeader className="flex items-center justify-between">
        <CardTitle>Strategien</CardTitle>
        <div className="flex items-center gap-2">
          <Badge variant="outline">
            {Array.isArray(data) ? `${data.length} gespeichert` : "—"}
          </Badge>
          <Button
            size="sm"
            variant={selected ? "outline" : "default"}
            onClick={() => applyStrategy(null)}
            title="Alle Strategien anzeigen"
          >
            Alle
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        {error && <div className="text-sm text-red-600">Strategien konnten nicht geladen werden.</div>}
        {isLoading && <div className="opacity-70 text-sm">Lade Strategien…</div>}

        <div className="flex gap-2 overflow-x-auto pb-1">
          {(data ?? []).map((s) => {
            const active = selected === s.name;
            const style = s.tag_color
              ? { backgroundColor: s.tag_color, color: "white", borderColor: s.tag_color }
              : undefined;
            return (
              <Button
                key={s._id}
                type="button"
                size="sm"
                variant={active ? "default" : "outline"}
                style={active ? style : undefined}
                onClick={() => onPick(s.name)}
                title={s.count ? `${s.name} (${s.count})` : s.name}
                className="shrink-0"
              >
                {s.name}
                {typeof s.count === "number" ? (
                  <span className="ml-2 text-xs opacity-80">({s.count})</span>
                ) : null}
              </Button>
            );
          })}
          {(!isLoading && (!data || data.length === 0)) && (
            <div className="opacity-60 text-sm">Noch keine Strategien gespeichert.</div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
