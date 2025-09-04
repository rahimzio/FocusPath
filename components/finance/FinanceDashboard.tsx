"use client";
import { useEffect, useMemo, useState, useCallback } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
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
import FinancialSummary from "./financialSummary";
import MetricCard from "./MetricCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import type { SavingEntry } from "@/utils/interface";
import AccountsOverview from "./AccountsOverview";
import AccountsManager from "./AccountManager";
import ExpensesList from "./ExpensesList";
import MonthlyPlanEditor from "./MonthlyPlanEditor";
import ActivePlanSummary from "./ActivePlanSummary";

function getISOWeekString(date: Date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  if (dayNum !== 1) d.setUTCDate(d.getUTCDate() + (1 - dayNum));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-${String(week).padStart(2, "0")}`;
}

export default function FinanceDashboard() {
  const { data: session } = useSession();
  const userId = (session as any)?.user?.id as string | undefined;

  const [savings, setSavings] = useState<SavingEntry[]>([]);
  const [incomeTotal, setIncomeTotal] = useState(0);
  const [expenseTotal, setExpenseTotal] = useState(0);
  const [metrics, setMetrics] = useState<any>(null);
  const [weeklyBudget, setWeeklyBudget] = useState<{ budget: number; spent: number } | null>(null);
  const [accountRefreshKey, setAccountRefreshKey] = useState(0);

  const currentWeek = useMemo(() => getISOWeekString(new Date()), []);

  const loadSavings = useCallback(async () => {
    if (!userId) return;
    const res = await fetch(`/api/finance/getSavings?userId=${userId}`);
    if (!res.ok) return;
    const data = await res.json();
    setSavings(data.savings || []);
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
      .reduce((sum: number, i: any) => sum + i.amount, 0);
    setIncomeTotal(total);
  }, [userId]);

  const loadExpenses = useCallback(async () => {
    if (!userId) return;
    const res = await fetch(`/api/finance/monthly?userId=${userId}`);
    if (!res.ok) return;
    const data = await res.json();
    setExpenseTotal(data.totalExpenses || 0);
  }, [userId]);

  const loadMetrics = useCallback(async () => {
    if (!userId) return;
    const res = await fetch(`/api/finance/metrics?userId=${userId}`);
    if (!res.ok) return;
    const data = await res.json();
    setMetrics(data);
  }, [userId]);

  const loadWeeklyBudget = useCallback(async () => {
    if (!userId) return;
    const res = await fetch(`/api/finance/getWeeklyBudget?userId=${userId}&week=${currentWeek}`);
    if (!res.ok) return;
    const data = await res.json();
    const b = data?.budget;
    if (b && typeof b.budget === "number") {
      setWeeklyBudget({ budget: b.budget, spent: Number(b.spent ?? 0) });
    } else {
      setWeeklyBudget(null);
    }
  }, [userId, currentWeek]);

  useEffect(() => {
    if (!userId) return;
    loadSavings();
    loadIncome();
    loadExpenses();
    loadMetrics();
    loadWeeklyBudget();
  }, [userId, loadSavings, loadIncome, loadExpenses, loadMetrics, loadWeeklyBudget]);

  if (!userId) return <p>Bitte einloggen…</p>;

  const savingsSum = useMemo(() => savings.reduce((s, e) => s + e.amount, 0), [savings]);
  const availableAfterFixed = useMemo(() => incomeTotal - expenseTotal, [incomeTotal, expenseTotal]);
  const remainingAfterSavings = useMemo(() => availableAfterFixed - savingsSum, [availableAfterFixed, savingsSum]);
  const chartData = useMemo(() => savings.map((s) => ({ month: s.month, amount: s.amount })), [savings]);

  const savingRate = Number(metrics?.savingRate ?? 0);
  const expenseGrowth = Number(metrics?.expenseGrowth ?? 0);
  const investmentROI = Number(metrics?.investmentROI ?? 0);

  const efCurrent = Number(metrics?.emergencyFundStatus?.current ?? 0);
  const efTarget = Number(metrics?.emergencyFundStatus?.target ?? 0);
  const efPercent = efTarget > 0 ? efCurrent / efTarget : 0;
  const efTooltip = `Notgroschen: ${efCurrent.toLocaleString("de-DE", { style: "currency", currency: "EUR" })} / ${efTarget.toLocaleString("de-DE", { style: "currency", currency: "EUR" })}`;

  return (
    <div className="space-y-6">
      {/* Aktionen */}
      <div className="flex flex-wrap gap-2">
        <AddSavingModal userId={userId} onSaved={() => { loadSavings(); loadMetrics(); }} />
        <AddIncomeModal userId={userId} onSaved={() => { loadIncome(); loadMetrics(); }} />
        <AddSavingGoalModal userId={userId} onSaved={() => { /* SavingGoalsOverview lädt selbst */ }} />
        <AddWeeklyBudgetModal userId={userId} week={currentWeek} onSaved={loadWeeklyBudget} />
        <AddExpenseModal userId={userId} onSaved={() => { loadExpenses(); loadWeeklyBudget(); loadMetrics(); }} />

        {/* Accounts & Transaktionen */}
        <AddAccountModal
          userId={userId}
          onSaved={() => {
            setAccountRefreshKey((k) => k + 1);
            loadMetrics();
          }}
        />
        <AddSavingsTransactionModal
          userId={userId}
          onSaved={() => { loadMetrics(); }}
          refreshKey={accountRefreshKey}
        />
      </div>

      {/* KPI-Karten */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
        <MetricCard title="Sparquote" value={savingRate} format="percent" isLoading={!metrics} tooltip="Anteil des Einkommens, der gespart wurde" />
        <MetricCard title="Ausgabenwachstum" value={expenseGrowth} format="percent" isLoading={!metrics} tooltip="Veränderung ggü. Vormonat" />
        <MetricCard title="Investment ROI" value={investmentROI} format="percent" isLoading={!metrics} />
        <MetricCard title="Notgroschen-Fortschritt" value={efPercent} format="percent" isLoading={!metrics} tooltip={efTooltip} />
      </div>

      <AccountsOverview userId={userId} />
      <div className="mt-4">
        <AccountsManager userId={userId} onChanged={() => { /* optional refresh */ }} />
      </div>

      {/* Monatszusammenfassung */}
      <FinancialSummary income={incomeTotal} expenses={expenseTotal} savings={savingsSum} />

      <ExpensesList userId={userId} />

      {/* Wochenbudget */}
      {weeklyBudget && (
        <div className="border p-4 rounded space-y-1">
          <p><strong>Wochenbudget (KW {currentWeek.split("-")[1]}):</strong> {weeklyBudget.budget.toLocaleString(undefined, { minimumFractionDigits: 2 })} €</p>
          <p>Bisher ausgegeben (Woche): {weeklyBudget.spent.toLocaleString(undefined, { minimumFractionDigits: 2 })} €</p>
          <p>Verfügbar: {(weeklyBudget.budget - weeklyBudget.spent).toLocaleString(undefined, { minimumFractionDigits: 2 })} €</p>
        </div>
      )}

      {/* Restpotenzial */}
      <div className="border p-4 rounded space-y-1">
        <p>Verfügbar nach Fixkosten: {availableAfterFixed.toLocaleString(undefined, { minimumFractionDigits: 2 })} €</p>
        <p>Gesparte Summe (Monat): {savingsSum.toLocaleString(undefined, { minimumFractionDigits: 2 })} €</p>
        <p>Restliches Sparpotenzial: {remainingAfterSavings.toLocaleString(undefined, { minimumFractionDigits: 2 })} €</p>
      </div>

      {/* Chart */}
      {chartData.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Sparen pro Monat</CardTitle></CardHeader>
          <CardContent>
            <div style={{ width: "100%", height: 300 }}>
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
{/* Finanzplan erstellen/ändern */}
<MonthlyPlanEditor userId={userId} />
{/* Aktiver Monats-Plan */}
<ActivePlanSummary userId={userId} />
      {/* Overviews */}
      <WeeklyBudgetOverview />
      <SavingGoalsOverview />
    </div>
  );
}
