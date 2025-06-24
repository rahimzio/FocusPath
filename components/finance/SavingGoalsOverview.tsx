"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { SavingGoal } from "@/utils/interface";

export default function SavingGoalsOverview() {
  const { data: session } = useSession();
  const [goals, setGoals] = useState<SavingGoal[]>([]);

  const userId = (session as any)?.user?.id as string | undefined;

  async function load() {
    if (!userId) return;
    const res = await fetch(`/api/finance/getSavingGoals?userId=${userId}`);
    const data = await res.json();
    setGoals(data.goals || []);
  }

  useEffect(() => { load(); }, [userId]);

  if (!userId) return null;

  return (
    <div className="grid gap-4">
      {goals.map((g) => {
        const percent = g.targetAmount ? Math.min(100, (g.currentAmount / g.targetAmount) * 100) : 0;
        return (
          <div key={g.title} className="p-4 border rounded">
            <div className="flex justify-between">
              <span>{g.title}</span>
              <span>{g.currentAmount} / {g.targetAmount} €</span>
            </div>
            <div className="w-full bg-gray-200 h-2 mt-2">
              <div className="h-2 bg-blue-500" style={{width: `${percent}%`}} />
            </div>
          </div>
        );
      })}
    </div>
  );
}