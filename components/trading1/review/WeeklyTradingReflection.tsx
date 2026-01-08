"use client";

import * as React from "react";
import useSWR from "swr";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const fetcher = (url: string) =>
  fetch(url).then((res) => {
    if (!res.ok) throw new Error("Failed to fetch");
    return res.json();
  });

type WeeklyReviewDoc = {
  _id?: any;
  type: "weekly_review";
  userId: string;

  label: string; // "YYYY-MM Wn"
  month: string; // "YYYY-MM"
  segment: "W1" | "W2" | "W3" | "W4";
  from: string; // YYYY-MM-DD
  to: string;   // YYYY-MM-DD

  tradeCount: number;
  wins: number;
  losses: number;
  be: number;
  winRate: number; // 0..100
  pnlSum: number;
  maxDrawdown: number;

  dayCount: number;
  avgDayScore: number; // 0..3
  dayGrades: { A: number; B: number; C: number };

  computedAt: string;

  // ============================
  // ✅ NEW (Step 4 UI): ICC
  // ============================
  iccTradeCount?: number;
  iccWins?: number;
  iccLosses?: number;
  iccBe?: number;
  iccWinRate?: number;
  iccViolations?: number;
  iccReviewOpen?: number;
  iccAvgChecklist?: number; // 0..1

  // ============================
  // ✅ NEW: Reflection Game summary
  // ============================
  avgReflectionScore?: number; // 0..3
  reflectionGrades?: { A: number; B: number; C: number };

  // ============================
  // ✅ NEW: Setup Game summary (future-proof)
  // ============================
  avgSetupScore?: number; // 0..3
  setupGrades?: { A: number; B: number; C: number };
};

function badgeVariantGrade(g: "A" | "B" | "C") {
  return g === "A" ? "default" : g === "B" ? "secondary" : "outline";
}

function gradeFromAvg(avg: number): "A" | "B" | "C" {
  if (avg >= 2.5) return "A";
  if (avg >= 1.5) return "B";
  return "C";
}

export default function WeeklyTradingReflection({
  userId,
  label,
}: {
  userId: string;
  label: string;
}) {
  const key = React.useMemo(() => {
    if (!userId || !label) return null;
    const p = new URLSearchParams({ userId, label });
    return `/api/trading/weekly/review?${p.toString()}`;
  }, [userId, label]);

  const { data, error, isLoading, mutate } = useSWR<{ review: WeeklyReviewDoc | null }>(
    key,
    fetcher
  );

  const review = data?.review ?? null;

  const [busy, setBusy] = React.useState(false);

  async function computeNow() {
    setBusy(true);
    try {
      const res = await fetch("/api/trading/weekly/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, label }),
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        alert("Compute fehlgeschlagen: " + txt);
        return;
      }

      await mutate();
    } finally {
      setBusy(false);
    }
  }

  const dayGrade = review ? gradeFromAvg(Number(review.avgDayScore || 0)) : "C";

  // ✅ NEW: derived grades for reflection/setup (safe)
  const reflectionGrade = review ? gradeFromAvg(Number(review.avgReflectionScore ?? 0)) : "C";
  const setupGrade = review ? gradeFromAvg(Number(review.avgSetupScore ?? 0)) : "C";

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3 flex-wrap">
        <div>
          <CardTitle>{label} – Weekly Review</CardTitle>
          <div className="text-xs text-muted-foreground mt-1">
            Aggregation aus Trades + Day Reflections (Final Day Grade / Score).
          </div>
        </div>

        {review ? (
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline">
              {review.from} → {review.to}
            </Badge>

            <Badge variant={badgeVariantGrade(dayGrade)}>
              Day Avg: {review.avgDayScore.toFixed(2)} → {dayGrade}
            </Badge>

            {/* ✅ NEW: ICC quick badge */}
            {typeof review.iccTradeCount === "number" && review.iccTradeCount > 0 ? (
              <Badge variant="secondary" title="ICC Weekly Summary">
                ICC: {review.iccTradeCount} • WR {Number(review.iccWinRate ?? 0).toFixed(0)}%
              </Badge>
            ) : null}

            {/* ✅ NEW: Reflection quick badge */}
            {typeof review.avgReflectionScore === "number" ? (
              <Badge variant={badgeVariantGrade(reflectionGrade)} title="Reflection Game Ø">
                Reflection Ø: {Number(review.avgReflectionScore).toFixed(2)} → {reflectionGrade}
              </Badge>
            ) : null}

            {/* ✅ NEW: Setup quick badge */}
            {typeof review.avgSetupScore === "number" && Number(review.avgSetupScore) > 0 ? (
              <Badge variant={badgeVariantGrade(setupGrade)} title="Setup Game Ø">
                Setup Ø: {Number(review.avgSetupScore).toFixed(2)} → {setupGrade}
              </Badge>
            ) : null}
          </div>
        ) : null}
      </CardHeader>

      <CardContent className="space-y-4">
        {isLoading && (
          <div className="text-sm text-muted-foreground">Weekly-Daten werden geladen…</div>
        )}

        {error && (
          <div className="text-sm text-destructive">Fehler beim Laden der Weekly-Daten.</div>
        )}

        {!isLoading && !error && !review && (
          <div className="space-y-3">
            <div className="text-sm text-muted-foreground">
              <b>{label}</b> – keine Weekly-Daten gefunden.
              <br />
              Klicke auf „Jetzt berechnen“, um diese Woche aus deinen Trades / Daily-Reflections zu aggregieren.
            </div>

            <Button onClick={computeNow} disabled={busy}>
              {busy ? "Berechne…" : "Jetzt berechnen"}
            </Button>
          </div>
        )}

        {!isLoading && !error && review && (
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-lg border p-3 text-sm">
              <div className="text-xs text-muted-foreground">Trades</div>
              <div className="mt-1">
                <b>{review.tradeCount}</b> Trades • WR <b>{review.winRate}%</b>
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {review.wins} W • {review.losses} L • {review.be} BE
              </div>
            </div>

            <div className="rounded-lg border p-3 text-sm">
              <div className="text-xs text-muted-foreground">PnL & Drawdown</div>
              <div className="mt-1">
                PnL Summe: <b>{Number(review.pnlSum).toFixed(2)}</b>
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                Max Drawdown: <b>{Number(review.maxDrawdown).toFixed(2)}</b>
              </div>
            </div>

            <div className="rounded-lg border p-3 text-sm">
              <div className="text-xs text-muted-foreground">Day Grades</div>
              <div className="mt-1 flex items-center gap-2 flex-wrap">
                <Badge variant="default">A: {review.dayGrades?.A ?? 0}</Badge>
                <Badge variant="secondary">B: {review.dayGrades?.B ?? 0}</Badge>
                <Badge variant="outline">C: {review.dayGrades?.C ?? 0}</Badge>
              </div>
              <div className="text-xs text-muted-foreground mt-2">
                Days mit Reflection: <b>{review.dayCount}</b>
              </div>
            </div>

            {/* ============================
                ✅ NEW: ICC Card
               ============================ */}
            {(typeof review.iccTradeCount === "number") ? (
              <div className="rounded-lg border p-3 text-sm">
                <div className="text-xs text-muted-foreground">ICC Weekly</div>

                {review.iccTradeCount > 0 ? (
                  <>
                    <div className="mt-1">
                      <b>{review.iccTradeCount}</b> ICC Trades • WR{" "}
                      <b>{Number(review.iccWinRate ?? 0).toFixed(0)}%</b>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {review.iccWins ?? 0} W • {review.iccLosses ?? 0} L • {review.iccBe ?? 0} BE
                    </div>

                    <div className="mt-2 flex items-center gap-2 flex-wrap">
                      <Badge variant="outline">
                        Ø Checklist: {Number(review.iccAvgChecklist ?? 0).toFixed(2)}
                      </Badge>
                      {(review.iccViolations ?? 0) > 0 ? (
                        <Badge variant="secondary">
                          Regelbrüche: {review.iccViolations}
                        </Badge>
                      ) : (
                        <Badge variant="outline">Regelbrüche: 0</Badge>
                      )}
                      {(review.iccReviewOpen ?? 0) > 0 ? (
                        <Badge variant="default">
                          Review: {review.iccReviewOpen}
                        </Badge>
                      ) : (
                        <Badge variant="outline">Review: 0</Badge>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="mt-1 text-xs text-muted-foreground">
                    Keine ICC-Trades in dieser Woche.
                  </div>
                )}
              </div>
            ) : null}

            {/* ============================
                ✅ NEW: Reflection Game Card
               ============================ */}
            {(typeof review.avgReflectionScore === "number" || review.reflectionGrades) ? (
              <div className="rounded-lg border p-3 text-sm">
                <div className="text-xs text-muted-foreground">Reflection Game</div>

                <div className="mt-1 flex items-center gap-2 flex-wrap">
                  <Badge variant={badgeVariantGrade(reflectionGrade)}>
                    Ø {Number(review.avgReflectionScore ?? 0).toFixed(2)} → {reflectionGrade}
                  </Badge>
                </div>

                <div className="text-xs text-muted-foreground mt-2">
                  Wochen-Verteilung:
                </div>
                <div className="mt-1 flex items-center gap-2 flex-wrap">
                  <Badge variant="default">A: {review.reflectionGrades?.A ?? 0}</Badge>
                  <Badge variant="secondary">B: {review.reflectionGrades?.B ?? 0}</Badge>
                  <Badge variant="outline">C: {review.reflectionGrades?.C ?? 0}</Badge>
                </div>
              </div>
            ) : null}

            {/* ============================
                ✅ NEW: Setup Game Card (future-proof)
               ============================ */}
            {(typeof review.avgSetupScore === "number" || review.setupGrades) ? (
              <div className="rounded-lg border p-3 text-sm">
                <div className="text-xs text-muted-foreground">Setup Game</div>

                <div className="mt-1 flex items-center gap-2 flex-wrap">
                  <Badge variant={badgeVariantGrade(setupGrade)}>
                    Ø {Number(review.avgSetupScore ?? 0).toFixed(2)} → {setupGrade}
                  </Badge>
                </div>

                <div className="text-xs text-muted-foreground mt-2">
                  Wochen-Verteilung:
                </div>
                <div className="mt-1 flex items-center gap-2 flex-wrap">
                  <Badge variant="default">A: {review.setupGrades?.A ?? 0}</Badge>
                  <Badge variant="secondary">B: {review.setupGrades?.B ?? 0}</Badge>
                  <Badge variant="outline">C: {review.setupGrades?.C ?? 0}</Badge>
                </div>

                <div className="mt-2 text-xs text-muted-foreground">
                  (Setup-Game kommt als nächster Schritt in die Daily Reflection)
                </div>
              </div>
            ) : null}

            <div className="md:col-span-3 flex items-center justify-between gap-2 flex-wrap pt-2">
              <div className="text-xs text-muted-foreground">
                computedAt: {review.computedAt}
              </div>

              <Button variant="outline" onClick={computeNow} disabled={busy}>
                {busy ? "Berechne…" : "Neu berechnen"}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
