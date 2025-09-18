"use client";
import * as React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const DEFAULT_OPTIONS = [
  "Setup exakt befolgen",
  "SL strikt respektieren",
  "Nicht jagen / FOMO parken",
  "Größe ≤ 0.5R bis A-Setup",
  "Ruhe vor Entry (3 Atemzüge)",
  "Kein Revenge / kein Add-on ohne Plan",
];

export type ProcessFocusValue = {
  focus: string[];        // max. 2 empfohlen
  ifThen?: string;        // If–Then-Regel
  intent?: string;        // Ein-Satz-Intention
};

export default function ProcessFocusPanel({
  value,
  onChange,
  maxSelect = 2,
}: {
  value?: ProcessFocusValue;
  onChange?: (v: ProcessFocusValue) => void;
  maxSelect?: number;
}) {
  const v = value ?? { focus: [], ifThen: "", intent: "" };
  const toggle = (item: string) => {
    const cur = new Set(v.focus);
    if (cur.has(item)) cur.delete(item);
    else if (cur.size < maxSelect) cur.add(item);
    onChange?.({ ...v, focus: Array.from(cur) });
  };

  return (
    <Card>
      <CardHeader><CardTitle>Process-Schwerpunkte (heute)</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {DEFAULT_OPTIONS.map(opt => {
            const active = v.focus.includes(opt);
            return (
              <button
                key={opt}
                type="button"
                onClick={() => toggle(opt)}
                className={cn(
                  "px-3 py-1 rounded-md border text-sm",
                  active ? "bg-primary text-primary-foreground" : "bg-secondary"
                )}
                aria-pressed={active}
                title={opt}
              >
                {opt}
              </button>
            );
          })}
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">If–Then-Plan</label>
          <Textarea
            placeholder='z. B. "Wenn ich Jagen spüre → 2 Atemzüge, dann Setup prüfen."'
            value={v.ifThen ?? ""}
            onChange={e => onChange?.({ ...v, ifThen: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Intention (1 Satz)</label>
          <Textarea
            placeholder="Worauf fokussierst du dich prozessual?"
            value={v.intent ?? ""}
            onChange={e => onChange?.({ ...v, intent: e.target.value })}
          />
        </div>
        <div className="text-xs text-muted-foreground">
          Tipp: Wähle <b>max. {maxSelect}</b> Schwerpunkte – Inchworm: erst hinten stabilisieren, dann vorne ausbauen.
        </div>
      </CardContent>
    </Card>
  );
}
