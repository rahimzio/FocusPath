"use client";

import * as React from "react";
import useSWR from "swr";
import {
  Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

const fetcher = (u: string) => fetch(u).then(r => r.json());

type Trade = {
  _id: string;
  date?: string;
  symbol?: string;
  pnl?: number;
  result?: "win" | "loss" | "BE" | "ongoing";
  gameCatalogScore?: number;       // 0..3
  gameCatalogGrade?: "A" | "B" | "C";
  gameComputed?: "A" | "B" | "C";
  strategy_name?: string;
};

type DayReflectionDoc = {
  _id?: string;
  type: "day_reflection";
  userId: string;
  date: string;                     // YYYY-MM-DD
  dayAvgScore?: number;             // 0..3 (FINAL, gespeichert)
  dayGrade?: "A" | "B" | "C";       // (FINAL, gespeichert)
  notes?: string;
  noTradeButGood?: boolean;
  missedSetups?: {
    count?: number;
    reasons?: string[];
    notes?: string;
  };
  manualExtras?: ("A"|"B"|"C")[];
  createdAt?: string;
  updatedAt?: string;
};

// NEW: lokale Tagesgrenzen in UTC
function dayBoundsUtc(dateStr: string) {
  // dateStr = "YYYY-MM-DD" als LOKALES Datum (Europe/Berlin)
  const [y, m, d] = dateStr.split("-").map(Number);
  // Lokales Mitternacht
  const localStart = new Date(y, (m - 1), d, 0, 0, 0, 0);
  const localEnd   = new Date(y, (m - 1), d, 23, 59, 59, 999);
  // Als UTC-ISO (Server speichert/vergleicht in UTC)
  const fromISO = new Date(localStart.getTime() - localStart.getTimezoneOffset() * 60000).toISOString();
  const toISO   = new Date(localEnd.getTime()   - localEnd.getTimezoneOffset()   * 60000).toISOString();
  return { fromISO, toISO };
}

// NEW: Anzeigezeitpunkt sauber in Europe/Berlin
function fmtBerlin(ts?: string) {
  if (!ts) return { date: "—", time: "—" };
  const dt = new Date(ts);
  const date = dt.toLocaleDateString("de-DE", { timeZone: "Europe/Berlin" });
  const time = dt.toLocaleTimeString("de-DE", { timeZone: "Europe/Berlin", hour: "2-digit", minute: "2-digit" });
  return { date, time };
}

function todayISO() {
  const d = new Date();
  const z = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${z(d.getMonth()+1)}-${z(d.getDate())}`;
}
function toDateOnly(s?: string) {
  if (!s) return "";
  return s.length > 10 ? s.slice(0,10) : s;
}
function gradeFromAvg(avg: number): "A"|"B"|"C" {
  if (avg >= 2.5) return "A";
  if (avg >= 1.5) return "B";
  return "C";
}
const pointsFor = (g: "A"|"B"|"C") => (g === "A" ? 3 : g === "B" ? 2 : 1);

export default function TradeDayReflection({ userId, date: dateProp }: { userId: string; date?: string }) {
  const [date, setDate] = React.useState<string>(toDateOnly(dateProp) || todayISO());

  // URL-Param ?date=YYYY-MM-DD übernehmen
  React.useEffect(() => {
    try {
      const u = new URL(window.location.href);
      const d = u.searchParams.get("date");
      if (d) setDate(toDateOnly(d));
    } catch {}
  }, []);

  // NEW: Trades-Key mit UTC-Grenzen
  const tradesKey = React.useMemo(() => {
    if (!userId || !date) return null;
    const { fromISO, toISO } = dayBoundsUtc(date);
    return `/api/trading/getRecent?userId=${encodeURIComponent(userId)}&from=${encodeURIComponent(fromISO)}&to=${encodeURIComponent(toISO)}&limit=1000&tz=Europe/Berlin`;
  }, [userId, date]);

  console.log("[TDR] mount", { userId, date });
  console.log("[TDR] tradesKey=", tradesKey);

  // Reflection Key für SWR
  const reflKey = React.useMemo(() => {
    if (!userId || !date) return null;
    return `/api/trading/day/reflection?userId=${encodeURIComponent(userId)}&date=${encodeURIComponent(date)}`;
  }, [userId, date]);

  console.log("[TDR] reflKey=", reflKey);

  // Daten laden
  const { data: tradesRes } = useSWR<{ trades: Trade[] }>(tradesKey, fetcher);
  const { data: reflRes, mutate: mutateRefl } = useSWR<{ reflection?: DayReflectionDoc }>(reflKey, fetcher);

  // Lokaler Edit-Status
  const rInit = reflRes?.reflection;
  const [notes, setNotes] = React.useState("");
  const [noTradeButGood, setNoTradeButGood] = React.useState(false);
  const [missedCount, setMissedCount] = React.useState<string>("");
  const [missedReasons, setMissedReasons] = React.useState<string[]>([]);
  const [missedNotes, setMissedNotes] = React.useState("");
  const [extras, setExtras] = React.useState<("A"|"B"|"C")[]>([]);

  // Wenn Reflection ankommt → Formularfelder füllen
  React.useEffect(() => {
    console.log("[TDR] tradesRes:", tradesRes);
    console.log("[TDR] reflection:", rInit);
  }, [tradesRes, rInit]);

  React.useEffect(() => {
    if (!rInit) {
      setNotes("");
      setNoTradeButGood(false);
      setMissedCount("");
      setMissedReasons([]);
      setMissedNotes("");
      setExtras([]);
      return;
    }
    setNotes(rInit.notes ?? "");
    setNoTradeButGood(!!rInit.noTradeButGood);
    setMissedCount(rInit.missedSetups?.count != null ? String(rInit.missedSetups.count) : "");
    setMissedReasons(Array.isArray(rInit.missedSetups?.reasons) ? rInit.missedSetups!.reasons! : []);
    setMissedNotes(rInit.missedSetups?.notes ?? "");
    setExtras(Array.isArray(rInit.manualExtras) ? rInit.manualExtras.filter((x): x is "A"|"B"|"C" => x==="A"||x==="B"||x==="C") : []);
  }, [rInit?._id, rInit?.updatedAt]);

  // Trades → Ø
  const trades = tradesRes?.trades ?? [];
  const { tradeAvgScore, tradeCount, tradeSum } = React.useMemo(() => {
    let sum = 0, n = 0;
    for (const t of trades) {
      const s = Number(t.gameCatalogScore);
      if (Number.isFinite(s) && s >= 0) { sum += s; n++; }
    }
    return { tradeAvgScore: n ? +(sum / n).toFixed(2) : 0, tradeCount: n, tradeSum: sum };
  }, [trades]);

  // Extras → Ø
  const { extraAvgScore, extraCount, extraSum } = React.useMemo(() => {
    const cnt = extras.length;
    if (!cnt) return { extraAvgScore: undefined as number|undefined, extraCount: 0, extraSum: 0 };
    const sum = extras.reduce((acc, g) => acc + pointsFor(g), 0);
    return { extraAvgScore: +(sum / cnt).toFixed(2), extraCount: cnt, extraSum: sum };
  }, [extras]);

  // Finale Ableitung (live)
  const { finalAvg, finalGrade, rationale } = React.useMemo(() => {
    const baseSum = tradeSum + extraSum;
    const baseCount = tradeCount + extraCount;

    if (baseCount === 0) {
      const avg = noTradeButGood ? 2.0 : 0;
      return {
        finalAvg: +avg.toFixed(2),
        finalGrade: gradeFromAvg(avg),
        rationale: noTradeButGood ? "Kein Trade & gut so → B (2.00)" : "Keine Daten",
      };
    }

    const avg = baseSum / baseCount;
    return {
      finalAvg: +avg.toFixed(2),
      finalGrade: gradeFromAvg(avg),
      rationale: `Gewichtet: Trades (${tradeCount}) + Extras (${extraCount})`,
    };
  }, [tradeSum, tradeCount, extraSum, extraCount, noTradeButGood]);

  React.useEffect(() => {
    console.log("[TDR] derived:", { tradeCount, tradeAvgScore, extraCount, extraAvgScore, finalAvg, finalGrade, rationale });
  }, [tradeCount, tradeAvgScore, extraCount, extraAvgScore, finalAvg, finalGrade, rationale]);

  // UI helpers
  function toggleReason(r: string) {
    setMissedReasons(prev => prev.includes(r) ? prev.filter(x => x !== r) : [...prev, r]);
  }
  const addExtra = (g: "A"|"B"|"C") => setExtras(prev => [...prev, g]);
  const removeExtra = (idx: number) => setExtras(prev => prev.filter((_, i) => i !== idx));

  async function saveReflection() {
    const payload: DayReflectionDoc = {
      type: "day_reflection",
      userId,
      date,
      dayAvgScore: finalAvg,           // FINAL (live → gespeichert)
      dayGrade: finalGrade,            // FINAL (live → gespeichert)
      notes: notes?.trim() || undefined,
      noTradeButGood,
      missedSetups: {
        count: Number.isFinite(Number(missedCount)) ? Number(missedCount) : undefined,
        reasons: missedReasons.length ? missedReasons : undefined,
        notes: missedNotes?.trim() || undefined,
      },
      manualExtras: extras.length ? extras : undefined,
    };
    console.log("[TDR] saveReflection payload=", payload);

    const res = await fetch("/api/trading/day/reflection", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    console.log("[TDR] saveReflection status=", res.status);

    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      alert("Speichern fehlgeschlagen: " + txt);
      return;
    }
    await mutateRefl();
  }

  // Persistiertes Daily-Rating (falls vorhanden)
  const savedAvg = rInit?.dayAvgScore;
  const savedGrade = rInit?.dayGrade;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div>
            <CardTitle>Day Reflection</CardTitle>
            <CardDescription>Alle Trades des Tages + kurze Tages-Reflexion & finales Tages-Game.</CardDescription>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-[150px]"
            />
            {/* Live abgeleitet */}
            <Badge variant={finalGrade === "A" ? "default" : finalGrade === "B" ? "secondary" : "outline"}>
              Tages-Game (final): {finalGrade} • {finalAvg.toFixed(2)} Pkt
            </Badge>
            {/* Persistiert (falls vorhanden) */}
            {savedGrade ? (
              <Badge variant="outline" title="Gespeichertes Daily-Rating aus day_reflection">
                Gespeichert: {savedGrade} • {(savedAvg ?? 0).toFixed(2)} Pkt
              </Badge>
            ) : null}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Trades Liste */}
        <div className="rounded-md border">
          <div className="px-3 py-2 text-sm font-medium border-b flex items-center justify-between">
            <span>Trades am {date}</span>
            <Badge variant="outline">{trades.length} Trades</Badge>
          </div>
          {trades.length === 0 ? (
            <div className="px-3 py-6 text-sm text-muted-foreground">
              Keine Trades. Nutze die Reflection unten (z. B. „kein Setup gesehen, gut so“) oder vergib optionale A/B/C-Extras.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b">
                    <th className="py-2 px-3">Zeit</th>
                    <th className="py-2 px-3">Symbol</th>
                    <th className="py-2 px-3">Result</th>
                    <th className="py-2 px-3">PnL</th>
                    <th className="py-2 px-3">Game</th>
                    <th className="py-2 px-3">Ø-Punkte</th>
                    <th className="py-2 px-3">Strategie</th>
                  </tr>
                </thead>
                <tbody>
                  {trades.map(t => {
                    // NEW: Berlin-korrekte Anzeige
                    const { date: dLocal, time } = fmtBerlin(t.date);
                    return (
                      <tr key={t._id} className="border-b last:border-0">
                        <td className="py-2 px-3 font-mono">{dLocal} {time}</td>
                        <td className="py-2 px-3">{t.symbol || "—"}</td>
                        <td className="py-2 px-3">{t.result || "—"}</td>
                        <td className={`py-2 px-3 tabular-nums ${Number(t.pnl) >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                          {Number.isFinite(Number(t.pnl)) ? Number(t.pnl).toFixed(2) : "—"}
                        </td>
                        <td className="py-2 px-3">{t.gameCatalogGrade || t.gameComputed || "—"}</td>
                        <td className="py-2 px-3">
                          {Number.isFinite(Number(t.gameCatalogScore)) ? Number(t.gameCatalogScore).toFixed(2) : "—"}
                        </td>
                        <td className="py-2 px-3">{t.strategy_name || "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Reflection Form + Extras */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="space-y-3">
            <label className="text-sm font-medium">Tages-Notizen / Gedanken</label>
            <Textarea
              placeholder="Was ist dir heute aufgefallen? Wie war Ausführung/Fokus/Emotion? Was nimmst du dir für morgen vor?"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={8}
            />

            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={noTradeButGood} onCheckedChange={(v) => setNoTradeButGood(!!v)} />
              Kein Trade heute & das war richtig (kein A-Setup/kein Edge) → gutes Verhalten festhalten
            </label>

            {/* Optionale A/B/C-Extras */}
            <div className="mt-3 space-y-2">
              <div className="text-sm font-medium">Optionale Tages-Extras</div>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="secondary" size="sm" onClick={() => addExtra("A")}>+ A (3)</Button>
                <Button type="button" variant="secondary" size="sm" onClick={() => addExtra("B")}>+ B (2)</Button>
                <Button type="button" variant="secondary" size="sm" onClick={() => addExtra("C")}>+ C (1)</Button>
              </div>

              {extras.length > 0 && (
                <div className="rounded-md border p-2 text-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      {extras.map((g, i) => (
                        <Badge key={i} variant={g==="A"?"default":g==="B"?"secondary":"outline"} className="mr-1">{g}</Badge>
                      ))}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Extras: {extraCount} • Ø {extraAvgScore?.toFixed(2) ?? "—"} Pkt
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {extras.map((g, i) => (
                      <Button key={`x-${i}`} type="button" size="sm" variant="ghost" onClick={() => removeExtra(i)}>
                        Entfernen {g}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Verpasste Setups */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Verpasste Setups</label>
              <div className="text-xs text-muted-foreground">Optional</div>
            </div>

            <div className="grid grid-cols-2 gap-3 items-end">
              <div>
                <div className="text-xs mb-1">Anzahl</div>
                <Input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={missedCount}
                  onChange={(e) => setMissedCount(e.target.value)}
                  placeholder="0"
                />
              </div>
              <div>
                <div className="text-xs mb-1">Häufigster Grund</div>
                <Select
                  value={missedReasons[0] || ""}
                  onValueChange={(v) => {
                    if (!v) return;
                    setMissedReasons(prev => prev.includes(v) ? prev : [v, ...prev]);
                  }}
                >
                  <SelectTrigger className="w-full"><SelectValue placeholder="Grund wählen" /></SelectTrigger>
                  <SelectContent>
                    {["Angst", "Gier", "Ablenkung", "Zu spät", "Unsicherheit", "Overanalysis", "Technik"].map(r => (
                      <SelectItem key={r} value={r}>{r}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {["Angst", "Gier", "Ablenkung", "Zu spät", "Unsicherheit", "Overanalysis", "Technik"].map(r => {
                const active = missedReasons.includes(r);
                return (
                  <button
                    key={r}
                    type="button"
                    onClick={() => toggleReason(r)}
                    className={[
                      "px-2 py-1 text-xs rounded-md border",
                      active ? "bg-primary text-primary-foreground" : "bg-secondary"
                    ].join(" ")}
                  >
                    {r}
                  </button>
                );
              })}
            </div>

            <div>
              <div className="text-xs mb-1">Bemerkungen zu verpassten Setups</div>
              <Textarea
                placeholder="z. B. Angst vor Reversal → If/Then für morgen …"
                value={missedNotes}
                onChange={(e) => setMissedNotes(e.target.value)}
                rows={5}
              />
            </div>
          </div>
        </div>

        {/* Finale Ableitung & Transparenz */}
        <div className="rounded-lg border p-3 text-sm grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <div className="text-xs text-muted-foreground">Trades</div>
            <div>n = {tradeCount} • Ø {tradeAvgScore.toFixed(2)} Pkt</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Extras</div>
            <div>n = {extraCount} • Ø {(extraAvgScore ?? 0).toFixed(2)} Pkt</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Regel</div>
            <div>{rationale}</div>
          </div>
          <div className="flex items-center md:justify-end">
            <Badge variant={finalGrade==="A"?"default":finalGrade==="B"?"secondary":"outline"}>
              Final: {finalGrade} • {finalAvg.toFixed(2)} Pkt
            </Badge>
          </div>
        </div>
      </CardContent>

      <CardFooter className="flex items-center justify-end gap-2">
        <Button onClick={saveReflection}>Reflection speichern</Button>
      </CardFooter>
    </Card>
  );
}
