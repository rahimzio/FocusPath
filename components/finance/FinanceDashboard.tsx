"use client";
import { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { useSession } from "next-auth/react";
import AddSavingModal from "./AddSavingModal";
import { SavingEntry } from "@/utils/interface";
import WeeklyBudgetOverview from "./WeeklyBudgetOverview";
import SavingGoalsOverview from "./SavingGoalsOverview";
import AddWeeklyBudgetModal from "./AddWeeklyBudgetModal";
import AddSavingGoalModal from "./AddSavingGoalModal";
import AddIncomeModal from "./AddIncomeModal";
import FinancialSummary from "./financialSummary";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import MetricCard from "./MetricCard";

function getWeekString(date: Date) {
  const firstDay = new Date(date.getFullYear(), 0, 1);
  const pastDays = Math.floor((+date - +firstDay) / 86400000);
  const week = Math.ceil((pastDays + firstDay.getDay() + 1) / 7);
  return `${date.getFullYear()}-${String(week).padStart(2, "0")}`;
}
export default function FinanceDashboard() {
  const { data: session } = useSession();
  const [savings, setSavings] = useState<SavingEntry[]>([]);
  const [incomeTotal, setIncomeTotal] = useState(0);
  const [expenseTotal, setExpenseTotal] = useState(0);
  const [metrics, setMetrics] = useState<any>(null);
  const userId = (session as any)?.user?.id as string | undefined;

  async function loadSavings() {
    if (!userId) return;
    const res = await fetch(`/api/finance/getSavings?userId=${userId}`);
    const data = await res.json();
    setSavings(data.savings || []);
  }

  useEffect(() => {
    loadSavings();
    loadIncome();
    loadExpenses();
    loadMetrics();
  }, [userId]);
  async function loadIncome() {
    if (!userId) return;
    const res = await fetch(`/api/finance/getIncome?userId=${userId}`);
    const data = await res.json();
    const current = new Date();
    const month = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, "0")}`;
    const total = (data.incomes || [])
      .filter((i: any) => i.month === month)
      .reduce((sum: number, i: any) => sum + i.amount, 0);
    setIncomeTotal(total);
  }

  async function loadExpenses() {
    const res = await fetch("/api/finance/monthly");
    const data = await res.json();
    setExpenseTotal(data.totalExpenses || 0);
  }
  const chartData = savings.map((s) => ({ month: s.month, amount: s.amount }));
async function loadMetrics() {
    if (!userId) return;
    const res = await fetch(`/api/finance/metrics?userId=${userId}`);
    const data = await res.json();
    setMetrics(data);
  }
  if (!userId) return <p>Bitte einloggen...</p>;

return (
  <div className="space-y-6">
    <>
      <div className="flex gap-2">
        <AddSavingModal userId={userId} onSaved={loadSavings} />
        <AddIncomeModal userId={userId} onSaved={loadIncome} />
        <AddWeeklyBudgetModal userId={userId} week={getWeekString(new Date())} onSaved={() => {}} />
        <AddSavingGoalModal userId={userId} onSaved={() => {}} />
      </div>
 {metrics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
          <MetricCard
            title="Sparquote"
            value={(metrics.savingRate * 100).toFixed(1)}
            unit="%"
            tooltip="Anteil des Einkommens, der gespart wurde"
          />
          <MetricCard
            title="Ausgabenwachstum"
            value={(metrics.expenseGrowth * 100).toFixed(1)}
            unit="%"
            tooltip="Veränderung der Ausgaben zum Vormonat"
          />
          <MetricCard
            title="Investment ROI"
            value={(metrics.investmentROI * 100).toFixed(1)}
            unit="%"
          />
          <MetricCard
            title="Notgroschen"
            value={`${metrics.emergencyFundStatus.current} / ${metrics.emergencyFundStatus.target}`}
            unit="€"
          />
        </div>
      )}

      <FinancialSummary
        income={incomeTotal}
        expenses={expenseTotal}
        savings={savings.reduce((s, e) => s + e.amount, 0)}
      />

      <div className="border p-4 rounded space-y-1">
        <p>Verfügbar nach Fixkosten: {incomeTotal - expenseTotal} €</p>
        <p>Automatisch zurückgelegte Sparsumme: {savings.reduce((s, e) => s + e.amount, 0)} €</p>
        <p>
          Restliches Sparpotenzial:{" "}
          {incomeTotal - expenseTotal - savings.reduce((s, e) => s + e.amount, 0)} €
        </p>
      </div>

      {chartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Savings</CardTitle>
          </CardHeader>
          <CardContent>
            <LineChart width={600} height={300} data={chartData}>
              <CartesianGrid stroke="#ccc" strokeDasharray="5 5" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="amount" stroke="#8884d8" />
            </LineChart>
          </CardContent>
        </Card>
      )}

      <WeeklyBudgetOverview />
      <SavingGoalsOverview />
    </>
  </div>
);
}