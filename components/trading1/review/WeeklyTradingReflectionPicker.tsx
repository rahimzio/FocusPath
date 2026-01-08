"use client";

import * as React from "react";
import WeeklyTradingReflection from "./WeeklyTradingReflection";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

type Segment = "W1" | "W2" | "W3" | "W4";

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function currentMonthStrBerlin(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  return `${y}-${pad2(m)}`;
}

/**
 * Segment nach Kalendertag (1-7=W1, 8-14=W2, 15-21=W3, 22+=W4)
 * (passt zu deiner API-Range Logik)
 */
function currentSegment(): Segment {
  const day = new Date().getDate();
  if (day <= 7) return "W1";
  if (day <= 14) return "W2";
  if (day <= 21) return "W3";
  return "W4";
}

function monthOptions(countBack: number = 12): string[] {
  const now = new Date();
  const out: string[] = [];
  for (let i = 0; i < countBack; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    out.push(`${d.getFullYear()}-${pad2(d.getMonth() + 1)}`);
  }
  return out;
}

export default function WeeklyTradingReflectionPicker({ userId }: { userId: string }) {
  const [month, setMonth] = React.useState<string>(currentMonthStrBerlin());
  const [segment, setSegment] = React.useState<Segment>(currentSegment());

  const label = React.useMemo(() => `${month} ${segment}`, [month, segment]);

  const months = React.useMemo(() => monthOptions(18), []);

  return (
    <Card>
      <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle className="text-sm">Weekly Reflection</CardTitle>
          <CardDescription className="text-xs">
            Wähle Monat + Segment (W1..W4). Label wird als <b>YYYY-MM Wn</b> an die Weekly-Aggregation übergeben.
          </CardDescription>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className="text-xs">
            Label: {label}
          </Badge>

          <Select value={month} onValueChange={setMonth}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Monat" />
            </SelectTrigger>
            <SelectContent>
              {months.map((m) => (
                <SelectItem key={m} value={m}>
                  {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={segment} onValueChange={(v) => setSegment(v as Segment)}>
            <SelectTrigger className="w-[90px]">
              <SelectValue placeholder="Woche" />
            </SelectTrigger>
            <SelectContent>
              {(["W1", "W2", "W3", "W4"] as Segment[]).map((w) => (
                <SelectItem key={w} value={w}>
                  {w}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <WeeklyTradingReflection userId={userId} label={label} />
      </CardContent>
    </Card>
  );
}
