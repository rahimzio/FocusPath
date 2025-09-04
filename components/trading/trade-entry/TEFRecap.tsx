"use client";

import React from "react";
import { useFormContext } from "react-hook-form";
import {
  FormField, FormItem, FormLabel, FormControl, FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useSession } from "next-auth/react";
import TEFGameCatalog from "./TEFGameCatalog";

type SessionKey = "Asia" | "London" | "NewYork" | "Overlap";
type BiasExec = "RR" | "RW" | "WR" | "WW";
type ConceptForm = {
  name: string;
  direction?: "bullish" | "bearish" | "neutral";
  timeframe: string;
  note?: string;
};

const SESSIONS: SessionKey[] = ["Asia", "London", "NewYork", "Overlap"];
const TF_OPTIONS = ["1m", "3m", "5m", "15m", "30m", "1h", "4h", "D"];
const CONCEPT_NAMES = [
  "Order Block", "NOS", "CISD", "UNI", "FVG", "Breaker", "Liquidity Grab", "BOS", "CHoCH",
];
const MISTAKE_OPTIONS = [
  "SL verschoben",
  "Overtrading",
  "FOMO",
  "Revenge",
  "Zu spätes Entry",
  "Zu frühes Entry",
  "Plan nicht befolgt",
  "Size zu groß",
];

function minutesBetween(start?: string, end?: string) {
  if (!start || !end) return 0;
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  if ([sh, sm, eh, em].some(Number.isNaN)) return 0;
  return Math.max(0, (eh * 60 + em) - (sh * 60 + sm));
}

/** (optional genutzt – bleibt hier) */
function computeMissingFields(values: any) {
  const missing: string[] = [];
  const need = {
    accountId: !!values.accountId,
    symbol: !!values.symbol,
    tradeType: !!values.tradeType,
    entry: Number.isFinite(Number(values.entry)),
    exit: Number.isFinite(Number(values.exit)),
    lotSize: Number.isFinite(Number(values.lotSize)),
    result: !!values.result,
  };
  Object.entries(need).forEach(([k, ok]) => { if (!ok) missing.push(k); });
  if (values.result === "BE") {
    const i = missing.indexOf("pnl");
    if (i >= 0) missing.splice(i, 1);
  }
  return missing;
}
type Props = { userId: string };

export default function TEFRecap({ userId }: Props) {

  const { control, setValue, watch } = useFormContext<any>();
  const v = watch();

  // Dauer auto aktualisieren
  React.useEffect(() => {
    const dur = minutesBetween(v.startTime, v.endTime);
    if ((v.durationMin ?? 0) !== dur) setValue("durationMin", dur, { shouldDirty: true });
  }, [v.startTime, v.endTime, v.durationMin, setValue]);

  // Defaults für Game-Integration
  React.useEffect(() => {
    if (!Array.isArray(v.gameItems)) setValue("gameItems", [], { shouldDirty: false });
    if (v.gameCatalogScore === undefined) setValue("gameCatalogScore", 0, { shouldDirty: false });
    if (!v.gameCatalogGrade) setValue("gameCatalogGrade", "B", { shouldDirty: false });
    if (!v.gameSelf) setValue("gameSelf", "B", { shouldDirty: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-6">
      {/* Zeit & Session */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <FormField control={control} name="startTime" render={({ field }) => (
          <FormItem>
            <FormLabel>Startzeit</FormLabel>
            <FormControl><Input type="time" {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={control} name="endTime" render={({ field }) => (
          <FormItem>
            <FormLabel>Endzeit</FormLabel>
            <FormControl><Input type="time" {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <div className="flex items-end">
          <Badge variant="outline">Dauer: {v.durationMin ?? 0} Min</Badge>
        </div>
      </div>

      <FormField control={control} name="session" render={({ field }) => (
        <FormItem>
          <FormLabel>Session</FormLabel>
          <FormControl>
            <Select value={field.value || ""} onValueChange={field.onChange}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Session wählen" /></SelectTrigger>
              <SelectContent>
                {SESSIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </FormControl>
          <FormMessage />
        </FormItem>
      )} />

      {/* Outcome / Bias vs Execution */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <FormLabel>Outcome-Flags</FormLabel>
          <div className="flex gap-6">
            <FormField control={control} name="outcomeFlags.breakEven" render={() => (
              <FormItem className="flex items-center gap-2">
                <FormControl>
                  <Checkbox
                    checked={!!v.outcomeFlags?.breakEven}
                    onCheckedChange={(c) => setValue("outcomeFlags.breakEven", c === true, { shouldDirty: true })}
                  />
                </FormControl>
                <FormLabel>Break Even</FormLabel>
              </FormItem>
            )} />
            <FormField control={control} name="outcomeFlags.stopHit" render={() => (
              <FormItem className="flex items-center gap-2">
                <FormControl>
                  <Checkbox
                    checked={!!v.outcomeFlags?.stopHit}
                    onCheckedChange={(c) => setValue("outcomeFlags.stopHit", c === true, { shouldDirty: true })}
                  />
                </FormControl>
                <FormLabel>Stop (SL/SI) getroffen</FormLabel>
              </FormItem>
            )} />
          </div>
        </div>

        <FormField control={control} name="biasExecution" render={({ field }) => (
          <FormItem>
            <FormLabel>Bias vs. Execution</FormLabel>
            <FormControl>
              <Select value={field.value || ""} onValueChange={field.onChange}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Auswahl" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="RR">Right Bias – Right Execution</SelectItem>
                  <SelectItem value="RW">Right Bias – Wrong Execution</SelectItem>
                  <SelectItem value="WR">Wrong Bias – Right Execution</SelectItem>
                  <SelectItem value="WW">Wrong Bias – Wrong Execution</SelectItem>
                </SelectContent>
              </Select>
            </FormControl>
            <FormMessage />
          </FormItem>
        )} />
      </div>

      {/* Mistakes (multi) */}
      <div className="space-y-2">
        <FormLabel>Trading Mistakes</FormLabel>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {MISTAKE_OPTIONS.map((m) => (
            <FormItem key={m} className="flex items-center gap-2">
              <FormControl>
                <Checkbox
                  checked={!!v.tradingMistakes?.includes(m)}
                  onCheckedChange={(c) => {
                    const set = new Set(v.tradingMistakes || []);
                    if (c) set.add(m); else set.delete(m);
                    setValue("tradingMistakes", Array.from(set), { shouldDirty: true });
                  }}
                />
              </FormControl>
              <FormLabel>{m}</FormLabel>
            </FormItem>
          ))}
        </div>
      </div>

      {/* --- Game-Katalog --- */}
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="text-base font-medium">Game-Katalog (A/B/C)</div>
          <div className="flex items-center gap-2">
            <Badge variant="outline">Items: {v.gameItems?.length ?? 0}</Badge>
            <Badge variant="outline">Score: {v.gameCatalogScore ?? 0}</Badge>
            <Badge variant={v.gameCatalogGrade === "A" ? "default" : v.gameCatalogGrade === "B" ? "secondary" : "outline"}>
              {v.gameCatalogGrade ?? "—"}-Game
            </Badge>
            <Badge variant={v.gameSelf === "A" ? "default" : v.gameSelf === "B" ? "secondary" : "outline"}>
              Selbst: {v.gameSelf ?? "—"}
            </Badge>
            {/* praktischer Button: Katalog-Grade → Self übernehmen */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!v.gameCatalogGrade}
              onClick={() => v.gameCatalogGrade && setValue("gameSelf", v.gameCatalogGrade, { shouldDirty: true })}
              title="Übernimmt die Katalog-Note als Selbsteinschätzung"
            >
              Note übernehmen
            </Button>
          </div>
        </div>
        <Separator />
        {!userId ? (
          <div className="text-sm text-muted-foreground">
            Keine <code>userId</code> gefunden – bitte einloggen, um deinen Katalog zu laden.
          </div>
        ) : (
          <TEFGameCatalog
            userId={userId}
            fieldName="gameItems"
            scoreField="gameCatalogScore"
            gradeField="gameCatalogGrade"
          />
        )}
      </div>

      {/* Range */}
      <div className="space-y-2">
        <FormItem className="flex items-center gap-2">
          <FormControl>
            <Checkbox
              checked={!!v.rangeDefined}
              onCheckedChange={(c) => setValue("rangeDefined", c === true, { shouldDirty: true })}
            />
          </FormControl>
          <FormLabel>Range definiert</FormLabel>
        </FormItem>
        <FormField control={control} name="rangeNote" render={({ field }) => (
          <FormItem>
            <FormLabel>Range-Notiz</FormLabel>
            <FormControl><Input placeholder="z. B. Asia Range, purge → London Breakout" {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
      </div>

      {/* Timeframes & Konzepte */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="space-y-2">
          <FormLabel>Gesehene Timeframes</FormLabel>
          <div className="grid grid-cols-2 gap-2">
            {TF_OPTIONS.map((tf) => (
              <FormItem key={tf} className="flex items-center gap-2">
                <FormControl>
                  <Checkbox
                    checked={!!v.viewTimeframes?.includes(tf)}
                    onCheckedChange={(c) => {
                      const set = new Set(v.viewTimeframes || []);
                      if (c) set.add(tf); else set.delete(tf);
                      setValue("viewTimeframes", Array.from(set), { shouldDirty: true });
                    }}
                  />
                </FormControl>
                <FormLabel>{tf}</FormLabel>
              </FormItem>
            ))}
          </div>
        </div>

        <FormField control={control} name="entryTimeframe" render={({ field }) => (
          <FormItem>
            <FormLabel>Entry-Timeframe</FormLabel>
            <FormControl>
              <Select value={field.value || ""} onValueChange={field.onChange}>
                <SelectTrigger className="w-full"><SelectValue placeholder="TF wählen" /></SelectTrigger>
                <SelectContent>
                  {TF_OPTIONS.map((tf) => <SelectItem key={tf} value={tf}>{tf}</SelectItem>)}
                </SelectContent>
              </Select>
            </FormControl>
            <FormMessage />
          </FormItem>
        )} />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <FormLabel>Konzepte (mit TF & Richtung)</FormLabel>
          <Button
            type="button"
            variant="secondary"
            onClick={() =>
              setValue("concepts", [
                ...(v.concepts || []),
                { name: "", timeframe: "", direction: "neutral" } as ConceptForm,
              ], { shouldDirty: true })
            }
          >
            + Konzept
          </Button>
        </div>

        <div className="space-y-3">
          {(v.concepts || []).map((c: ConceptForm, idx: number) => (
            <div key={idx} className="border rounded p-3 grid grid-cols-1 sm:grid-cols-4 gap-2">
              {/* Name */}
              <div>
                <label className="text-sm font-medium">Name</label>
                <Select
                  value={c.name || ""}
                  onValueChange={(val) => {
                    const arr = [...(v.concepts || [])];
                    arr[idx] = { ...arr[idx], name: val };
                    setValue("concepts", arr, { shouldDirty: true });
                  }}
                >
                  <SelectTrigger className="w-full"><SelectValue placeholder="Konzept" /></SelectTrigger>
                  <SelectContent>
                    {CONCEPT_NAMES.map((n) => <SelectItem key={n} value={n}>{n}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {/* Richtung */}
              <div>
                <label className="text-sm font-medium">Richtung</label>
                <Select
                  value={c.direction || "neutral"}
                  onValueChange={(val: any) => {
                    const arr = [...(v.concepts || [])];
                    arr[idx] = { ...arr[idx], direction: val };
                    setValue("concepts", arr, { shouldDirty: true });
                  }}
                >
                  <SelectTrigger className="w-full"><SelectValue placeholder="Richtung" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bullish">bullish</SelectItem>
                    <SelectItem value="bearish">bearish</SelectItem>
                    <SelectItem value="neutral">neutral</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* TF */}
              <div>
                <label className="text-sm font-medium">TF</label>
                <Select
                  value={c.timeframe || ""}
                  onValueChange={(val) => {
                    const arr = [...(v.concepts || [])];
                    arr[idx] = { ...arr[idx], timeframe: val };
                    setValue("concepts", arr, { shouldDirty: true });
                  }}
                >
                  <SelectTrigger className="w-full"><SelectValue placeholder="TF" /></SelectTrigger>
                  <SelectContent>
                    {TF_OPTIONS.map((tf) => <SelectItem key={tf} value={tf}>{tf}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {/* Notiz + Remove */}
              <div className="flex gap-2">
                <Input
                  placeholder="Notiz (optional)"
                  value={c.note || ""}
                  onChange={(e) => {
                    const arr = [...(v.concepts || [])];
                    arr[idx] = { ...arr[idx], note: e.target.value };
                    setValue("concepts", arr, { shouldDirty: true });
                  }}
                />
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    const arr = [...(v.concepts || [])];
                    arr.splice(idx, 1);
                    setValue("concepts", arr, { shouldDirty: true });
                  }}
                >
                  Entfernen
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Ort & Self-Game */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField control={control} name="location" render={({ field }) => (
          <FormItem>
            <FormLabel>Ort (optional)</FormLabel>
            <FormControl><Input placeholder="z. B. Bonn" {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />

        <FormField control={control} name="gameSelf" render={({ field }) => (
          <FormItem>
            <FormLabel>Eigenes Game (A/B/C)</FormLabel>
            <FormControl>
              <Select value={field.value || ""} onValueChange={field.onChange}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Selbsteinschätzung" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="A">A</SelectItem>
                  <SelectItem value="B">B</SelectItem>
                  <SelectItem value="C">C</SelectItem>
                </SelectContent>
              </Select>
            </FormControl>
            <FormMessage />
          </FormItem>
        )} />
      </div>

      <div className="text-xs text-muted-foreground">
        Beispiel: 06:05–06:20 Uhr (15 Min) • 16.08.2025 • 15m & 5m gesehen, Entry 1m • Bullish Order Block (15m),
        NOS (5m), CISD (5m) • Right Bias – Wrong Execution
      </div>
    </div>
  );
}
