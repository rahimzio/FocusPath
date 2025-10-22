// SavingGoalsOverview.tsx
"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import AddSavingGoalModal from "./AddSavingGoalModal";
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
function parseAmount(s: string): number {
  if (!s) return NaN;
  const cleaned = s.replace(/[^\d,.\-]/g, "");
  if (!cleaned) return NaN;
  if (cleaned.includes(",") && cleaned.includes(".")) return Number(cleaned.replace(/\./g, "").replace(",", "."));
  if (cleaned.includes(",")) return Number(cleaned.replace(",", "."));
  return Number(cleaned);
}

type GoalView = SavingGoal & {
  target: number;
  current: number;
  percent: number;
  remaining: number;
  deadlineLabel: string | null;
  monthly?: number;
};

export default function SavingGoalsOverview() {
  const { data: session } = useSession();
  const userId = (session as any)?.user?.id as string | undefined;

  const [goals, setGoals] = useState<SavingGoal[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [activeGoal, setActiveGoal] = useState<GoalView | null>(null);
  const [mode, setMode] = useState<"deposit" | "withdraw">("deposit");
  const [amountStr, setAmountStr] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [modalErr, setModalErr] = useState<string | null>(null);

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

  const processed: GoalView[] = useMemo(() => {
    return goals
      .map((g) => {
        const target = Number((g as any).targetAmount ?? 0);
        const current = Number((g as any).currentAmount ?? 0);
        const percent = target > 0 ? Math.min(100, (current / target) * 100) : 0;
        const remaining = Math.max(0, target - current);
        const deadlineLabel = fmtDate((g as any).deadline);
        const monthly = (g as any).monthlyContribution as number | undefined;
        return { ...(g as any), target, current, percent, remaining, deadlineLabel, monthly };
      })
      .sort((a, b) => {
        const ad = a.deadlineLabel ? 0 : 1;
        const bd = b.deadlineLabel ? 0 : 1;
        if (ad !== bd) return ad - bd;
        return b.percent - a.percent;
      });
  }, [goals]);

  async function submitAdjust() {
    if (!activeGoal || !userId) return;
    const amt = parseAmount(amountStr);
    if (!Number.isFinite(amt) || amt <= 0) { setModalErr("Betrag muss > 0 sein"); return; }
    if (!date) { setModalErr("Bitte Datum wählen"); return; }
    setSaving(true); setModalErr(null);
    try {
      const id = String((activeGoal as any)._id ?? (activeGoal as any).id);
      const body = { userId, goalId: id, delta: mode === "deposit" ? amt : -amt, date: new Date(date).toISOString(), note: note.trim() || undefined };
      const r = await fetch("/api/finance/updateSavingGoal", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body)
      });
      if (!r.ok) {
        let m = "Fehler beim Aktualisieren"; try { m = (await r.json()).message || m; } catch {}
        throw new Error(m);
      }
      await load();
      setActiveGoal(null);
      setMode("deposit"); setAmountStr(""); setNote("");
      setDate(new Date().toISOString().slice(0, 10));
    } catch (e: any) {
      setModalErr(e?.message || "Unerwarteter Fehler");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p>Sparziele werden geladen…</p>;
  if (err) return <p className="text-red-600">{err}</p>;

  if (processed.length === 0) {
    return (
      <Card className="w-full max-w-full overflow-hidden">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <CardTitle className="text-gray-800 dark:text-gray-100">Sparziele</CardTitle>
          <AddSavingGoalModal userId={userId} onSaved={load} />
        </CardHeader>
        <CardContent>Noch keine Sparziele angelegt.</CardContent>
      </Card>
    );
  }

  return (
    <>
      {/* Header-Zeile: bricht sauber auf mobilen Geräten um */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2 min-w-0">
        <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100 truncate">
          Sparziele
        </h3>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <AddSavingGoalModal userId={userId} onSaved={load} />
        </div>
      </div>

      {/* Responsive Grid: 1 / 2 / 3 Spalten */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {processed.map((g, idx) => {
          const key = (g as any)._id ?? `${g.title}-${idx}`;
          return (
            <Card
              key={key}
              className="cursor-pointer hover:bg-muted/30 transition-colors w-full max-w-full min-w-0"
              onClick={() => setActiveGoal(g)}
            >
              <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 space-y-0 min-w-0">
                {/* Titel kürzt neben den Badges/Buttons statt Layout zu sprengen */}
                <CardTitle className="text-base font-semibold break-words sm:truncate sm:max-w-[60%]">
                  {g.title}
                </CardTitle>

                <div className="flex items-center flex-wrap gap-2 sm:justify-end">
                  {g.deadlineLabel && (
                    <Badge variant="secondary" className="whitespace-nowrap">Bis {g.deadlineLabel}</Badge>
                  )}
                  {typeof g.monthly === "number" && g.monthly > 0 && (
                    <Badge variant="outline" className="whitespace-nowrap">Monatlich: {fmtEUR(g.monthly)}</Badge>
                  )}
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={(e) => { e.stopPropagation(); setActiveGoal(g); }}
                    aria-label={`Sparziel ${g.title} anpassen`}
                    className="whitespace-nowrap"
                  >
                    Einzahlen / Abheben
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="space-y-3">
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
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Modal: kompakte, responsive Breite */}
      <Dialog open={!!activeGoal} onOpenChange={(o) => !o && setActiveGoal(null)}>
        <DialogContent className="sm:max-w-md w-full">
          <DialogHeader>
            <DialogTitle>
              Sparziel anpassen{activeGoal ? ` – ${activeGoal.title}` : ""}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="text-sm">Aktion</label>
                <Select value={mode} onValueChange={(v) => setMode(v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="deposit">Einzahlen</SelectItem>
                    <SelectItem value="withdraw">Abheben</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm">Datum</label>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
            </div>

            <div>
              <label className="text-sm">Betrag</label>
              <Input inputMode="decimal" value={amountStr} onChange={(e) => setAmountStr(e.target.value)} placeholder="z. B. 50,00" />
            </div>

            <div>
              <label className="text-sm">Notiz (optional)</label>
              <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="optional" />
            </div>

            {modalErr && <p className="text-sm text-red-600">{modalErr}</p>}

            <Button className="w-full" onClick={submitAdjust} disabled={saving}>
              {saving ? "Speichern…" : "Speichern"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
