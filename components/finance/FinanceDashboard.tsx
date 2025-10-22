"use client";
import { useEffect, useMemo, useState, useCallback } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useSession } from "next-auth/react";

import AddSavingModal from "./AddSavingModal";
import AddIncomeModal from "./AddIncomeModal";
import AddSavingGoalModal from "./AddSavingGoalModal";
import AddWeeklyBudgetModal from "./AddWeeklyBudgetModal";
import AddExpenseModal from "./AddExpenseModal";
import AddAccountModal from "./AddAccountModal";
import AddSavingsTransactionModal from "./AddSavingsTransactionModal";

import WeeklyBudgetOverview from "./WeeklyBudgetOverview";
import SavingGoalsOverview from "./SavingGoalsOverview";
import MetricCard from "./MetricCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import AccountsOverview from "./AccountsOverview";
import ExpensesList from "./ExpensesList";
import MonthlyPlanEditor from "./MonthlyPlanEditor";
import ActivePlanSummary from "./ActivePlanSummary";
import FinancialSummary from "./financialSummary";
import AccountsManager from "./AccountManager";
import { SavingEntry } from "@/utils/interfaces/finance";

/** Einheitlicher ISO-KW-Key: "YYYY-ww" (ohne 'W') */
function getISOWeekKey(date: Date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  if (day !== 1) d.setUTCDate(d.getUTCDate() + (1 - day));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-${String(week).padStart(2, "0")}`;
}

const fmtNum = (n: number) =>
  Number(n || 0).toLocaleString("de-DE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export default function FinanceDashboard() {
  const { data: session } = useSession();
  const userId = (session as any)?.user?.id as string | undefined;

  const [savings, setSavings] = useState<SavingEntry[]>([]);
  const [incomeTotal, setIncomeTotal] = useState(0);
  const [expenseTotal, setExpenseTotal] = useState(0);
  const [metrics, setMetrics] = useState<any>(null);
  const [accountRefreshKey, setAccountRefreshKey] = useState(0);

  const currentWeek = useMemo(() => getISOWeekKey(new Date()), []);

  const loadSavings = useCallback(async () => {
    if (!userId) return;
    const res = await fetch(`/api/finance/getSavings?userId=${userId}`);
    if (!res.ok) return;
    const data = await res.json();
    setSavings(Array.isArray(data.savings) ? data.savings : []);
  }, [userId]);

  const loadIncome = useCallback(async () => {
    if (!userId) return;
    const res = await fetch(`/api/finance/getIncome?userId=${userId}`);
    if (!res.ok) return;
    const data = await res.json();
    const now = new Date();
    const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const total = (data.incomes || [])
      .filter((i: any) => i.month === ym)
      .reduce((sum: number, i: any) => sum + Number(i.amount || 0), 0);
    setIncomeTotal(total);
  }, [userId]);

  const loadExpenses = useCallback(async () => {
    if (!userId) return;
    const res = await fetch(`/api/finance/monthly?userId=${userId}`);
    if (!res.ok) return;
    const data = await res.json();
    setExpenseTotal(Number(data.totalExpenses || 0));
  }, [userId]);

  const loadMetrics = useCallback(async () => {
    if (!userId) return;
    const res = await fetch(`/api/finance/metrics?userId=${userId}`);
    if (!res.ok) return;
    const data = await res.json();
    setMetrics(data);
  }, [userId]);

  const refreshAll = useCallback(() => {
    loadSavings();
    loadIncome();
    loadExpenses();
    loadMetrics();
  }, [loadSavings, loadIncome, loadExpenses, loadMetrics]);

  useEffect(() => {
    if (!userId) return;
    refreshAll();
  }, [userId, refreshAll]);

  if (!userId) return <p>Bitte einloggen…</p>;

  const savingsSum = useMemo(
    () => (savings || []).reduce((s, e) => s + Number(e.amount || 0), 0),
    [savings]
  );
  const availableAfterFixed = useMemo(
    () => incomeTotal - expenseTotal,
    [incomeTotal, expenseTotal]
  );
  const remainingAfterSavings = useMemo(
    () => availableAfterFixed - savingsSum,
    [availableAfterFixed, savingsSum]
  );
  const chartData = useMemo(
    () => (savings || []).map((s) => ({ month: s.month, amount: Number(s.amount || 0) })),
    [savings]
  );

  const savingRate = Number(metrics?.savingRate ?? 0);
  const expenseGrowth = Number(metrics?.expenseGrowth ?? 0);
  const investmentROI = Number(metrics?.investmentROI ?? 0);

  const efCurrent = Number(metrics?.emergencyFundStatus?.current ?? 0);
  const efTarget = Number(metrics?.emergencyFundStatus?.target ?? 0);
  const efPercent = efTarget > 0 ? efCurrent / efTarget : 0;
  const efTooltip = `Notgroschen: ${efCurrent.toLocaleString("de-DE", {
    style: "currency",
    currency: "EUR",
  })} / ${efTarget.toLocaleString("de-DE", { style: "currency", currency: "EUR" })}`;

  return (
    <div className="mx-auto w-full max-w-screen-lg px-3 sm:px-4 space-y-6">
      {/* Aktionen */}
      <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2">
        <div className="flex flex-wrap gap-2 min-w-0">
          <AddSavingModal
            userId={userId}
            onSaved={() => {
              loadSavings();
              loadMetrics();
            }}
          />
          <AddIncomeModal
            userId={userId}
            onSaved={() => {
              loadIncome();
              loadMetrics();
            }}
          />
          <AddExpenseModal
            userId={userId}
            onSaved={() => {
              loadExpenses();
              loadMetrics();
            }}
          />
          <AddWeeklyBudgetModal
            userId={userId}
            week={currentWeek}
            onSaved={() => {
              /* separate Komponente lädt selbst */
            }}
          />
        </div>
        <div className="flex flex-wrap gap-2 min-w-0">
          <AddSavingGoalModal
            userId={userId}
            onSaved={() => {
              /* Ziele laden ihr UI selbst */
            }}
          />
          <AddAccountModal
            userId={userId}
            onSaved={() => {
              setAccountRefreshKey((k) => k + 1);
              loadMetrics();
            }}
          />
          <AddSavingsTransactionModal
            userId={userId}
            onSaved={() => {
              loadMetrics();
            }}
            refreshKey={accountRefreshKey}
          />
        </div>
      </div>

      {/* KPI-Karten */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <MetricCard
          title="Sparquote"
          value={savingRate}
          format="percent"
          isLoading={!metrics}
          tooltip="Anteil des Einkommens, der gespart wurde"
        />
        <MetricCard
          title="Ausgabenwachstum"
          value={expenseGrowth}
          format="percent"
          isLoading={!metrics}
          tooltip="Veränderung ggü. Vormonat"
        />
        <MetricCard title="Investment ROI" value={investmentROI} format="percent" isLoading={!metrics} />
        <MetricCard
          title="Notgroschen-Fortschritt"
          value={efPercent}
          format="percent"
          isLoading={!metrics}
          tooltip={efTooltip}
        />
      </div>

      {/* Konten & Vermögen */}
      <div className="w-full max-w-full overflow-hidden">
        <AccountsOverview userId={userId} />
      </div>

      {/* Konten-Manager */}
      <div className="mt-4 w-full max-w-full overflow-hidden">
        <AccountsManager userId={userId} onChanged={() => {}} />
      </div>

      {/* Monatszusammenfassung */}
      <div className="w-full max-w-full overflow-hidden">
        <FinancialSummary income={incomeTotal} expenses={expenseTotal} savings={savingsSum} />
      </div>

      {/* Ausgabenliste */}
      <div className="w-full max-w-full overflow-hidden">
        <ExpensesList userId={userId} />
      </div>

      {/* Finanzplan & Aktiver Plan */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="w-full max-w-full overflow-hidden">
          <MonthlyPlanEditor userId={userId} />
        </div>
        <div className="w-full max-w-full overflow-hidden">
          <ActivePlanSummary userId={userId} />
        </div>
      </div>

      {/* Weekly Budget & Sparziele */}
      <div className="w-full max-w-full overflow-hidden">
        <WeeklyBudgetOverview />
      </div>
      <div className="w-full max-w-full overflow-hidden">
        <SavingGoalsOverview />
      </div>

      {/* Chart – Sparen pro Monat */}
      {chartData.length > 0 && (
        <Card className="w-full max-w-full overflow-hidden">
          <CardHeader>
            <CardTitle>Sparen pro Monat</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="w-full h-64 sm:h-72 lg:h-80">
              <ResponsiveContainer>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="5 5" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="amount" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Restpotenzial */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="border p-4 rounded space-y-1 w-full max-w-full">
          <p>Verfügbar nach Fixkosten: {fmtNum(availableAfterFixed)} €</p>
          <p>Gesparte Summe (Monat): {fmtNum(savingsSum)} €</p>
        </div>
        <div className="border p-4 rounded space-y-1 w-full max-w-full">
          <p>Restliches Sparpotenzial: {fmtNum(remainingAfterSavings)} €</p>
        </div>
      </div>
    </div>
  );
}
