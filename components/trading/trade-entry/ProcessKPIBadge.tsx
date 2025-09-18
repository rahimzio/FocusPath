"use client";
import * as React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";

export type ProcessKPIValue = {
  adherence?: number;       // 0..100
  tiltNoticed?: boolean;
  cooldownDone?: boolean;
  debrief?: string;
};

export default function ProcessKPIBadge({
  value,
  onChange,
}: {
  value?: ProcessKPIValue;
  onChange?: (v: ProcessKPIValue) => void;
}) {
  const v = value ?? {};
  const adherence = typeof v.adherence === "number" ? v.adherence : 0;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Process-KPI</CardTitle>
        <Badge variant={adherence >= 80 ? "default" : adherence >= 60 ? "secondary" : "outline"}>
          {adherence}% Adherence
        </Badge>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2">
          <div className="text-sm">Selbstbewertung der Ausführung</div>
          <Slider
            min={0} max={100} step={1}
            value={[adherence]}
            onValueChange={(arr: any[]) => onChange?.({ ...v, adherence: arr?.[0] ?? 0 })}
          />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={!!v.tiltNoticed}
            onCheckedChange={(c) => onChange?.({ ...v, tiltNoticed: c === true })}
          />
          Tilt bemerkt
        </label>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={!!v.cooldownDone}
            onCheckedChange={(c) => onChange?.({ ...v, cooldownDone: c === true })}
          />
          Kurzer Cooldown durchgeführt
        </label>
        <div className="space-y-2">
          <div className="text-sm">Post-Briefing (1 Satz)</div>
          <textarea
            className="w-full min-h-[72px] rounded-md border bg-background px-3 py-2 text-sm"
            placeholder="Was lief prozessual gut/schlecht?"
            value={v.debrief ?? ""}
            onChange={(e) => onChange?.({ ...v, debrief: e.target.value })}
          />
        </div>
      </CardContent>
    </Card>
  );
}
