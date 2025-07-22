"use client";
import React, { useEffect, useState } from "react";
import { Goal } from "@/utils/interface";
import {
  parseISO,
  isWithinInterval,
  startOfWeek,
  endOfWeek,
} from "date-fns";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Pencil, MoveRight, Trash2 } from "lucide-react";
import GoalCreateSheet from "./GoalCreateSheet";

export default function GoalOverviewDashboard() {
 
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [moveMode, setMoveMode] = useState(false);
  const [editedGoal, setEditedGoal] = useState<Partial<Goal>>({});
  const [newStartDate, setNewStartDate] = useState("");
  const [newEndDate, setNewEndDate] = useState("");

  const [openSheet, setOpenSheet] = useState(false);

  useEffect(() => {
    const fetchGoals = async () => {
      const res = await fetch("/api/auth/session");
      const session = await res.json();
      const userId = session?.user?.id;
      if (!userId) {
        console.warn("⚠️ Keine userId vorhanden");
        return;
      }
      fetch(`/api/goals/getGoals?userId=${userId}`)
        .then((r) => r.json())
        .then((data) => {
          setGoals(data.goals || []);
          setLoading(false);
        })
        .catch((err) => {
          console.error("Fehler beim Laden der Ziele", err);
          setLoading(false);
        });

    };


    fetchGoals();
  }, []);

  const handleToggleGoalCompletion = async (goal: Goal) => {
    const newProgress = goal.progress === 100 ? 0 : 100;
    const completedAt = newProgress === 100 ? new Date().toISOString() : null;
    try {
      const res = await fetch("/api/goals/updateGoalProgress", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goalId: goal._id, progress: newProgress, completedAt }),
      });
      if (!res.ok) throw new Error("Fehler beim Aktualisieren des Fortschritts");
      setGoals((prev) =>
        prev.map((g) =>
          g._id === goal._id
            ? { ...g, progress: newProgress, completedAt: completedAt ?? undefined }
            : g
        )
      );
    } catch (err) {
      console.error(err);
    }
  };

  const openEditDialog = (goal: Goal) => {
    setSelectedGoal(goal);
    setEditMode(true);
    setMoveMode(false);
    setEditedGoal({ title: goal.title, description: goal.description });
  };

  const openMoveDialog = (goal: Goal) => {
    setSelectedGoal(goal);
    setMoveMode(true);
    setEditMode(false);
    setNewStartDate(goal.startDate);
    setNewEndDate(goal.endDate);
  };

  const handleSave = async () => {
    if (!selectedGoal) return;
    await fetch(`/api/goals/updateGoal`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ goalId: selectedGoal._id, ...editedGoal }),
    });
    setSelectedGoal(null);
    setEditMode(false);
  };

  const handleMove = async () => {
    if (!selectedGoal) return;
    await fetch(`/api/goals/updateGoal`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ goalId: selectedGoal._id, startDate: newStartDate, endDate: newEndDate }),
    });
    setSelectedGoal(null);
    setMoveMode(false);
  };

  const categorizeGoals = (all: Goal[]) => {
    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
    const weekly: Goal[] = [];
    const monthly: Goal[] = [];
    const yearly: Goal[] = [];
    const past: Goal[] = [];
    all.forEach((goal) => {
      const start = parseISO(goal.startDate);
      const end = parseISO(goal.endDate);
      if (end < now && goal.progress < 100) {
        past.push(goal);
        return;
      }
      const type = goal.goalType || goal.type;
      if (type === "weekly" && isWithinInterval(now, { start, end })) {
        weekly.push(goal);
      } else if (type === "monthly") {
        monthly.push(goal);
      } else if (type === "yearly") {
        yearly.push(goal);
      }
    });
    return { weekly, monthly, yearly, past };
  };

  const { weekly, monthly, yearly, past } = categorizeGoals(goals);

  const GoalCard = ({ goal }: { goal: Goal }) => {
    const isExpired = new Date(goal.endDate) < new Date() && goal.progress < 100;
    return (
      <Card className="group relative hover:shadow-lg transition-shadow">
        <CardHeader>
          <CardTitle className="text-base flex items-center justify-between">
            {goal.title}
            {isExpired && <span className="text-xs text-red-500">Abgelaufen</span>}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-muted-foreground">{goal.description}</p>
          <Progress value={goal.progress} />
        </CardContent>
        <CardFooter className="justify-end gap-2 opacity-0 group-hover:opacity-100 transition">
          <TooltipProvider delayDuration={100}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="icon" variant="ghost" onClick={() => openEditDialog(goal)}>
                  <Pencil className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Bearbeiten</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="icon" variant="ghost" onClick={() => openMoveDialog(goal)}>
                  <MoveRight className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Verschieben</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="icon" variant="ghost" onClick={() => console.log("delete", goal._id)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Löschen</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </CardFooter>
      </Card>
    );
  };

  if (loading) return <p>Ziele werden geladen...</p>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">🎯 Wochenziele</h2>
        <Sheet open={openSheet} onOpenChange={setOpenSheet}>
          <SheetTrigger asChild>
            <Button variant="outline">Alle Ziele anzeigen</Button>
          </SheetTrigger>
          <SheetContent className="w-[420px] sm:w-[560px] overflow-y-auto">
            <SheetHeader>
              <SheetTitle>Alle Ziele</SheetTitle>
            </SheetHeader>
            <div className="space-y-6 pb-10">
              <section>
                <h3 className="font-semibold mb-2">Monatsziele</h3>
                {monthly.length ? monthly.map((g) => <GoalCard key={g._id} goal={g} />) : <p className="text-sm text-muted-foreground">Keine Monatsziele</p>}
              </section>
              <section>
                <h3 className="font-semibold mb-2">Jahresziele</h3>
                {yearly.length ? yearly.map((g) => <GoalCard key={g._id} goal={g} />) : <p className="text-sm text-muted-foreground">Keine Jahresziele</p>}
              </section>
              <section>
                <h3 className="font-semibold mb-2">Vergangene Ziele</h3>
                {past.length ? past.map((g) => <GoalCard key={g._id} goal={g} />) : <p className="text-sm text-muted-foreground">Keine vergangenen Ziele</p>}
              </section>
              <section>
                <GoalCreateSheet onGoalCreated={(goal) => setGoals((prev) => [...prev, goal])} />
              </section>
            </div>
          </SheetContent>
        </Sheet>
      </div>
      {weekly.length ? weekly.map((g) => <GoalCard key={g._id} goal={g} />) : <p className="text-sm text-muted-foreground">Keine Ziele für diese Woche</p>}

      {selectedGoal && (
        <Dialog open={!!selectedGoal} onOpenChange={() => setSelectedGoal(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editMode ? "Ziel bearbeiten" : moveMode ? "Ziel verschieben" : "Ziel"}</DialogTitle>
            </DialogHeader>
            <>
              {editMode && (
                <>
                  <label className="block text-sm font-medium mb-1">Titel</label>
                  <input
                    type="text"
                    value={editedGoal.title || ""}
                    onChange={(e) => setEditedGoal((prev) => ({ ...prev, title: e.target.value }))}
                    className="border p-2 w-full rounded mb-3"
                  />
                  <label className="block text-sm font-medium mb-1">Beschreibung</label>
                  <textarea
                    value={editedGoal.description || ""}
                    onChange={(e) => setEditedGoal((prev) => ({ ...prev, description: e.target.value }))}
                    className="border p-2 w-full rounded mb-4"
                  />
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setSelectedGoal(null)}>
                      Abbrechen
                    </Button>
                    <Button onClick={handleSave}>Speichern</Button>
                  </div>
                </>
              )}
              {moveMode && (
                <>
                  <label className="block text-sm font-medium mb-1">Neues Startdatum</label>
                  <input
                    type="date"
                    value={newStartDate}
                    onChange={(e) => setNewStartDate(e.target.value)}
                    className="border p-2 w-full rounded mb-3"
                  />
                  <label className="block text-sm font-medium mb-1">Neues Enddatum</label>
                  <input
                    type="date"
                    value={newEndDate}
                    onChange={(e) => setNewEndDate(e.target.value)}
                    className="border p-2 w-full rounded mb-4"
                  />
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setSelectedGoal(null)}>
                      Abbrechen
                    </Button>
                    <Button onClick={handleMove}>Speichern</Button>
                  </div>
                </>
              )}
            </>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}