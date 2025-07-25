"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { SavingGoal } from "@/utils/interface";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
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
          <Card key={g.title}>
            <CardHeader>
              <CardTitle>{g.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Fortschritt</span>
                <span>{g.currentAmount} / {g.targetAmount} €</span>
              </div>
              <Progress value={percent} />
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}