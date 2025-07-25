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
function getWeekString(date: Date) {
  const firstDay = new Date(date.getFullYear(), 0, 1);
  const pastDays = Math.floor((+date - +firstDay) / 86400000);
  const week = Math.ceil((pastDays + firstDay.getDay() + 1) / 7);
  return `${date.getFullYear()}-${String(week).padStart(2, "0")}`;
}
export default function FinanceDashboard() {
  const { data: session } = useSession();
  const [savings, setSavings] = useState<SavingEntry[]>([]);

  const userId = (session as any)?.user?.id as string | undefined;

  async function loadSavings() {
    if (!userId) return;
    const res = await fetch(`/api/finance/getSavings?userId=${userId}`);
    const data = await res.json();
    setSavings(data.savings || []);
  }

  useEffect(() => {
    loadSavings();
  }, [userId]);

  const chartData = savings.map((s) => ({ month: s.month, amount: s.amount }));

  if (!userId) return <p>Bitte einloggen...</p>;

  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        <AddSavingModal userId={userId} onSaved={loadSavings} />
        <AddWeeklyBudgetModal userId={userId} week={getWeekString(new Date())} onSaved={() => {}} />
        <AddSavingGoalModal userId={userId} onSaved={() => {}} />
      </div>      {chartData.length > 0 && (
        <LineChart width={600} height={300} data={chartData}>
          <CartesianGrid stroke="#ccc" strokeDasharray="5 5" />
          <XAxis dataKey="month" />
          <YAxis />
          <Tooltip />
          <Line type="monotone" dataKey="amount" stroke="#8884d8" />
        </LineChart>
      )}
      <WeeklyBudgetOverview />
      <SavingGoalsOverview />
    </div>
  );
}