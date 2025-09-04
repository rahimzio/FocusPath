"use client";
import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import FinancialSummary from "./financialSummary";

export default function FinanceOverview() {
  const { data: session } = useSession();
  const userId = (session as any)?.user?.id as string | undefined;

  const [income, setIncome] = useState(0);
  const [expenses, setExpenses] = useState(0);
  const [savings, setSavings] = useState(0);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch(`/api/finance/overview?userId=${userId}`);
      if (!res.ok) throw new Error("Konnte Finanzübersicht nicht laden");
      const data = await res.json();
      setIncome(Number(data.income ?? 0));
      setExpenses(Number(data.expenses ?? 0));
      setSavings(Number(data.savings ?? 0));
    } catch (e: any) {
      setErr(e?.message ?? "Unerwarteter Fehler");
      setIncome(0); setExpenses(0); setSavings(0);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  if (!userId) return <p>Bitte einloggen…</p>;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold text-center">Finance Overview</h1>

      {err && <p className="text-sm text-red-600">{err}</p>}
      {loading ? (
        <p>Lade…</p>
      ) : (
        <FinancialSummary income={income} expenses={expenses} savings={savings} />
      )}
    </div>
  );
}
