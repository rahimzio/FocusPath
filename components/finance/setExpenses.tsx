"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SavingGoal } from "@/utils/interfaces/finance";

function fmtEUR(n: number) {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(n) ? n : 0);
}

function fmtDate(d?: string | null) {
  if (!d) return null;
  const date = new Date(d);
  if (isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("de-DE", { dateStyle: "medium" }).format(date);
}

export default function SavingGoalsOverview() {
  const { data: session } = useSession();
  const userId = (session as any)?.user?.id as string | undefined;

  const [goals, setGoals] = useState<SavingGoal[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Einzahlungs-UI-States pro Ziel
  const [depositStr, setDepositStr] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const [depositErr, setDepositErr] = useState<Record<string, string | null>>({});

  const setBusyFor = (id: string, v: boolean) => setBusy((m) => ({ ...m, [id]: v }));
  const setDepStrFor = (id: string, v: string) => setDepositStr((m) => ({ ...m, [id]: v }));
  const setDepErrFor = (id: string, v: string | null) => setDepositErr((m) => ({ ...m, [id]: v }));

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch(`/api/finance/getSavingGoals?userId=${userId}`);
      if (!res.ok) throw new Error("Konnte Sparziele nicht laden");
      const data = await res.json();
      setGoals(Array.isArray(data.goals) ? data.goals : []);
    } catch (e: any) {
      setErr(e?.message ?? "Unerwarteter Fehler");
      setGoals([]);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  if (!userId) return null;

  const processed = useMemo(() => {
    return goals
      .map((g) => {
        const id = (g as any)._id ? String((g as any)._id) : g.title;
        const target = Number(g.targetAmount ?? 0);
        const current = Number(g.currentAmount ?? 0);
        const percent = target > 0 ? Math.min(100, (current / target) * 100) : 0;
        const remaining = Math.max(0, target - current);
        const deadlineLabel = fmtDate((g as any).deadline); // optional
        const monthly = (g as any).monthlyContribution as number | undefined;
        return { ...g, _id: id, target, current, percent, remaining, deadlineLabel, monthly };
      })
      // Sortieren: erst mit Deadline (frühere zuerst), sonst nach höchstem Fortschritt
      .sort((a, b) => {
        const ad = a.deadlineLabel ? 0 : 1;
        const bd = b.deadlineLabel ? 0 : 1;
        if (ad !== bd) return ad - bd;
        return b.percent - a.percent;
      });
  }, [goals]);

  async function handleDeposit(g: any) {
    const id = String(g._id);
    const raw = (depositStr[id] ?? "").trim();
    if (!raw) { setDepErrFor(id, "Bitte Betrag eingeben."); return; }

    // "12,50" -> 12.5
    const parsed = Number(raw.replace(",", "."));
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setDepErrFor(id, "Ungültiger Betrag.");
      return;
    }

    setDepErrFor(id, null);
    setBusyFor(id, true);
    try {
      // Variante A (SET): neuen currentAmount senden (am kompatibelsten)
      const newCurrent = Number(g.current) + parsed;
      const res = await fetch("/api/finance/updateSavingGoal", {
        method: "POST", // falls dein Endpoint PATCH ist, einfach ändern
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          goalId: id,
          currentAmount: newCurrent,
        }),
      });

      // Variante B (INC): falls dein Backend lieber Delta erwartet, nimm stattdessen:
      // const res = await fetch("/api/finance/updateSavingGoal", {
      //   method: "POST",
      //   headers: { "Content-Type": "application/json" },
      //   body: JSON.stringify({ userId, goalId: id, amountDelta: parsed }),
      // });

      if (!res.ok) {
        const msg = await res.text().catch(() => "");
        throw new Error(msg || "Fehler beim Einzahlen");
      }
      // nach Erfolg: UI aktualisieren
      setDepStrFor(id, "");
      await load();
    } catch (e: any) {
      setDepErrFor(id, e?.message ?? "Unerwarteter Fehler");
    } finally {
      setBusyFor(id, false);
    }
  }

  if (loading) return <p>Sparziele werden geladen…</p>;
  if (err) return <p className="text-red-600">{err}</p>;
  if (processed.length === 0) return <p>Noch keine Sparziele angelegt.</p>;

  return (
    <div className="grid gap-4">
      {processed.map((g, idx) => {
        const key = g._id ?? `${g.title}-${idx}`;
        const id = String(g._id);
        const isBusy = !!busy[id];
        const depStr = depositStr[id] ?? "";

        return (
          <Card key={key}>
            <CardHeader className="flex items-center justify-between space-y-0">
              <CardTitle className="text-base font-semibold">{g.title}</CardTitle>
              <div className="flex gap-2">
                {g.deadlineLabel && <Badge variant="secondary">Bis {g.deadlineLabel}</Badge>}
                {typeof g.monthly === "number" && g.monthly > 0 && (
                  <Badge variant="outline">Monatlich: {fmtEUR(g.monthly)}</Badge>
                )}
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span>Fortschritt</span>
                  <span className="tabular-nums">
                    {fmtEUR(g.current)} / {fmtEUR(g.target)} ({g.percent.toFixed(1)}%)
                  </span>
                </div>
                <Progress value={g.percent} />

                <div className="flex justify-between text-sm">
                  <span>Restbetrag</span>
                  <span className="tabular-nums">{fmtEUR(g.remaining)}</span>
                </div>
              </div>

              {/* Mini-Action: Einzahlen */}
              <div className="flex flex-col sm:flex-row gap-2">
                <Input
                  inputMode="decimal"
                  pattern="[0-9]*[.,]?[0-9]*"
                  placeholder="z. B. 50,00"
                  value={depStr}
                  onChange={(e) => setDepStrFor(id, e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !isBusy) {
                      e.preventDefault();
                      handleDeposit(g);
                    }
                  }}
                />
                <Button
                  onClick={() => handleDeposit(g)}
                  disabled={isBusy || !depStr.trim()}
                >
                  {isBusy ? "Zahlt ein…" : "Einzahlen"}
                </Button>
              </div>
              {depositErr[id] && <p className="text-sm text-red-600">{depositErr[id]}</p>}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
