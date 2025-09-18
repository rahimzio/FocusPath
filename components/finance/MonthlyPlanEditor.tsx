// MonthlyPlanEditor.tsx
"use client";
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Bill = { label: string; amount: string };
type Row = { label: string; pct: string; amount: string };

function toNum(s: string) {
  const n = Number(String(s).replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}
const EUR = (n: number) =>
  new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(n);

export default function MonthlyPlanEditor({ userId }: { userId: string }) {
  const [month, setMonth] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const [total, setTotal] = useState("0");
  const [funPct, setFunPct] = useState("10");
  const [funAmt, setFunAmt] = useState("");

  const [bills, setBills] = useState<Bill[]>([
    { label: "Rechnungen", amount: "0" },
  ]);
  const [invest, setInvest] = useState<Row[]>([
    { label: "ETF-Sparplan", pct: "0", amount: "" },
  ]);
  const [extras, setExtras] = useState<Row[]>([
    { label: "Education", pct: "2.5", amount: "" },
  ]);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const totalNum = useMemo(() => toNum(total), [total]);
  const funPctNum = useMemo(() => toNum(funPct), [funPct]);
  const funAmtNum = useMemo(
    () => (funAmt ? toNum(funAmt) : (totalNum * funPctNum) / 100),
    [funAmt, totalNum, funPctNum]
  );

  const billsSum = useMemo(
    () => bills.reduce((s, b) => s + toNum(b.amount), 0),
    [bills]
  );
  const investSum = useMemo(
    () =>
      invest.reduce(
        (s, r) =>
          s +
          (r.amount
            ? toNum(r.amount)
            : r.pct
            ? (totalNum * toNum(r.pct)) / 100
            : 0),
        0
      ),
    [invest, totalNum]
  );
  const extrasSum = useMemo(
    () =>
      extras.reduce(
        (s, r) =>
          s +
          (r.amount
            ? toNum(r.amount)
            : r.pct
            ? (totalNum * toNum(r.pct)) / 100
            : 0),
        0
      ),
    [extras, totalNum]
  );

  const planned = useMemo(
    () => billsSum + investSum + extrasSum + funAmtNum,
    [billsSum, investSum, extrasSum, funAmtNum]
  );
  const leftover = useMemo(() => totalNum - planned, [totalNum, planned]);
  const validPlan = totalNum > 0 && leftover >= 0;

  async function savePlan() {
    setSaving(true);
    setStatus(null);
    try {
      const payload = {
        userId,
        month,
        total: totalNum,
        funmoneyPct: funAmt ? undefined : funPctNum,
        funmoneyAmount: funAmt ? funAmtNum : undefined,
        bills: bills.map((b) => ({ label: b.label, amount: toNum(b.amount) })),
        investments: invest.map((r) => ({
          label: r.label,
          pct: r.pct ? toNum(r.pct) : undefined,
          amount: r.amount ? toNum(r.amount) : undefined,
        })),
        extras: extras.map((r) => ({
          label: r.label,
          pct: r.pct ? toNum(r.pct) : undefined,
          amount: r.amount ? toNum(r.amount) : undefined,
        })),
      };
      const r = await fetch("/api/finance/plan/upsert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!r.ok)
        throw new Error(
          (await r.json()).message || "Plan konnte nicht gespeichert werden"
        );
      setStatus("Plan gespeichert.");
    } catch (e: any) {
      setStatus(e?.message || "Fehler");
    } finally {
      setSaving(false);
    }
  }

  async function activatePlan() {
    setSaving(true);
    setStatus(null);
    try {
      const r = await fetch("/api/finance/plan/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, month }),
      });
      if (!r.ok)
        throw new Error(
          (await r.json()).message || "Plan konnte nicht aktiviert werden"
        );
      setStatus("Plan aktiviert: Wochenbudgets erzeugt.");
    } catch (e: any) {
      setStatus(e?.message || "Fehler");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="w-full max-w-full overflow-hidden">
      <CardHeader>
        <CardTitle className="text-gray-800 dark:text-gray-100">
          Monatlichen Finanzplan erstellen
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <div>
            <label className="text-sm">Monat</label>
            <Input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm">Insgesamt (planbar)</label>
            <Input
              inputMode="decimal"
              value={total}
              onChange={(e) => setTotal(e.target.value)}
            />
          </div>
          <div className="text-sm flex items-end">
            Funmoney (berechnet): {EUR(funAmtNum)}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div>
            <label className="text-sm">Funmoney %</label>
            <Input
              inputMode="decimal"
              value={funPct}
              onChange={(e) => setFunPct(e.target.value)}
              disabled={!!funAmt}
            />
            <p className="text-xs opacity-70">
              Oder direkten Betrag unten eintragen.
            </p>
          </div>
          <div>
            <label className="text-sm">Funmoney Betrag (optional)</label>
            <Input
              inputMode="decimal"
              value={funAmt}
              onChange={(e) => setFunAmt(e.target.value)}
            />
          </div>
        </div>

        {/* Bills */}
        <div>
          <div className="font-medium mb-1">Fixkosten (Bills)</div>
          {bills.map((b, i) => (
            <div key={i} className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
              <Input
                placeholder="Label"
                value={b.label}
                onChange={(e) => {
                  const v = [...bills];
                  v[i] = { ...v[i], label: e.target.value };
                  setBills(v);
                }}
              />
              <div className="flex gap-2">
                <Input
                  className="flex-1"
                  inputMode="decimal"
                  placeholder="Betrag"
                  value={b.amount}
                  onChange={(e) => {
                    const v = [...bills];
                    v[i] = { ...v[i], amount: e.target.value };
                    setBills(v);
                  }}
                />
                <Button
                  variant="ghost"
                  onClick={() =>
                    setBills((v) => v.filter((_, idx) => idx !== i))
                  }
                  aria-label="Zeile entfernen"
                >
                  ✕
                </Button>
              </div>
            </div>
          ))}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setBills((v) => [...v, { label: "", amount: "0" }])}
          >
            + Zeile
          </Button>
        </div>

        {/* Investments */}
        <div>
          <div className="font-medium mb-1">Investments</div>
          {invest.map((r, i) => (
            <div key={i} className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-2">
              <Input
                placeholder="Label"
                value={r.label}
                onChange={(e) => {
                  const v = [...invest];
                  v[i] = { ...v[i], label: e.target.value };
                  setInvest(v);
                }}
              />
              <Input
                inputMode="decimal"
                placeholder="% (optional)"
                value={r.pct}
                onChange={(e) => {
                  const v = [...invest];
                  v[i] = { ...v[i], pct: e.target.value };
                  setInvest(v);
                }}
              />
              <div className="flex gap-2">
                <Input
                  className="flex-1"
                  inputMode="decimal"
                  placeholder="Betrag (optional)"
                  value={r.amount}
                  onChange={(e) => {
                    const v = [...invest];
                    v[i] = { ...v[i], amount: e.target.value };
                    setInvest(v);
                  }}
                />
                <Button
                  variant="ghost"
                  onClick={() =>
                    setInvest((v) => v.filter((_, idx) => idx !== i))
                  }
                  aria-label="Zeile entfernen"
                >
                  ✕
                </Button>
              </div>
            </div>
          ))}
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              setInvest((v) => [...v, { label: "", pct: "", amount: "" }])
            }
          >
            + Zeile
          </Button>
        </div>

        {/* Extras */}
        <div>
          <div className="font-medium mb-1">Extras</div>
          {extras.map((r, i) => (
            <div key={i} className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-2">
              <Input
                placeholder="Label"
                value={r.label}
                onChange={(e) => {
                  const v = [...extras];
                  v[i] = { ...v[i], label: e.target.value };
                  setExtras(v);
                }}
              />
              <Input
                inputMode="decimal"
                placeholder="% (optional)"
                value={r.pct}
                onChange={(e) => {
                  const v = [...extras];
                  v[i] = { ...v[i], pct: e.target.value };
                  setExtras(v);
                }}
              />
              <div className="flex gap-2">
                <Input
                  className="flex-1"
                  inputMode="decimal"
                  placeholder="Betrag (optional)"
                  value={r.amount}
                  onChange={(e) => {
                    const v = [...extras];
                    v[i] = { ...v[i], amount: e.target.value };
                    setExtras(v);
                  }}
                />
                <Button
                  variant="ghost"
                  onClick={() =>
                    setExtras((v) => v.filter((_, idx) => idx !== i))
                  }
                  aria-label="Zeile entfernen"
                >
                  ✕
                </Button>
              </div>
            </div>
          ))}
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              setExtras((v) => [...v, { label: "", pct: "", amount: "" }])
            }
          >
            + Zeile
          </Button>
        </div>

        {/* Zusammenfassung */}
        <div className="rounded-lg border p-3 text-sm space-y-1">
          <div className="flex justify-between">
            <span>Bills</span>
            <span>{EUR(billsSum)}</span>
          </div>
          <div className="flex justify-between">
            <span>Investments</span>
            <span>{EUR(investSum)}</span>
          </div>
          <div className="flex justify-between">
            <span>Extras</span>
            <span>{EUR(extrasSum)}</span>
          </div>
          <div className="flex justify-between">
            <span>Funmoney</span>
            <span>{EUR(funAmtNum)}</span>
          </div>
          <div className="flex justify-between font-medium pt-1 border-t">
            <span>Geplant</span>
            <span>{EUR(planned)}</span>
          </div>
          <div
            className={cn(
              "flex justify-between font-semibold",
              leftover < 0 ? "text-red-600" : "text-green-600"
            )}
          >
            <span>Rest</span>
            <span>{EUR(leftover)}</span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <Button
            className="w-full sm:w-auto"
            onClick={savePlan}
            disabled={saving || !validPlan}
          >
            Plan speichern
          </Button>
          <Button
            className="w-full sm:w-auto"
            variant="secondary"
            onClick={activatePlan}
            disabled={saving || !validPlan || funAmtNum <= 0}
          >
            Für Monat aktivieren
          </Button>
        </div>

        {status && (
          <div
            className={cn(
              "text-sm",
              status.toLowerCase().includes("fehler")
                ? "text-red-600"
                : "text-emerald-700"
            )}
          >
            {status}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
