import React, { useEffect, useState } from "react";
import { Goal, Task } from "@/utils/interface";
import {
  parseISO,
  isWithinInterval,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
} from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import GoalCard from "./GoalCard";
import WeeklyGoalsDashboard from "./WeeklyGoalsDashboard";
import FullGoalManagerSheet from "./FullGoalManagerSheet";
import GoalCreateSheet from "./GoalCreateSheet";
import { normalizeGoalType } from "@/utils/goals/progress";
import {
  deleteGoal,
  duplicateGoal,
  patchGoalProgress,
  updateGoal,
} from "@/lib/api/goal";

export default function GoalOverviewDashboard() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [moveMode, setMoveMode] = useState(false);
  const [editedGoal, setEditedGoal] = useState<Partial<Goal>>({});
  const [newStartDate, setNewStartDate] = useState("");
  const [newEndDate, setNewEndDate] = useState("");
  const [filter, setFilter] = useState("all");
  const [openSheet, setOpenSheet] = useState(false);

  type ViewMode = "goals" | "stats" | "history";
  const [view, setView] = useState<ViewMode>("goals");

  useEffect(() => {
    const fetchGoals = async () => {
      try {
        const sessionRes = await fetch("/api/auth/session");
        const session = await sessionRes.json();
        const userId = session?.user?.id;
        if (!userId) return;

        const res = await fetch(`/api/goals/getGoals?userId=${userId}`);
        const data = await res.json();
        setGoals(data.goals || []);
      } catch (err) {
        console.error("Fehler beim Laden der Ziele", err);
      } finally {
        setLoading(false);
      }
    };
    fetchGoals();
  }, []);

  const handleEdit = (goal: Goal) => {
    setSelectedGoal(goal);
    setEditMode(true);
    setMoveMode(false);
    setEditedGoal({
      title: goal.title,
      description: goal.description,
      startDate: goal.startDate,
      endDate: goal.endDate,
      goalType: goal.goalType || (goal as any).type,
      tasks: goal.tasks ? [...goal.tasks] : [],
      completedAt: goal.completedAt,
    });
  };

  const handleAddTask = () => {
    setEditedGoal((prev) => ({
      ...prev,
      tasks: [
        ...(prev.tasks || []),
        {
          name: "",
          description: "",
          duration: "",
          color: "",
          time: "",
          category: "",
          frequency: "once",
          timebased: false,
          dueDate: "",
          points: 0,
          status: "todo",
          _id: crypto.randomUUID?.() || Math.random().toString(),
          linkedApps: [],
          subTasks: [],
          excludedDates: [],
        },
      ] as Task[],
    }));
  };

  // EINHEITLICH: optimistisches Toggle-Complete via API-Wrapper
  const handleToggleCompletion = async (goal: Goal) => {
    const nextProgress = goal.progress === 100 ? 0 : 100;
    const completedAt =
      nextProgress === 100 ? new Date().toISOString() : null;

    // Optimistic UI
    setGoals((prev) =>
      prev.map((g) =>
        g._id === goal._id
          ? {
            ...g,
            progress: nextProgress,
            completedAt: completedAt ?? undefined,
          }
          : g
      )
    );

    try {
      await patchGoalProgress(goal._id, nextProgress, completedAt);
    } catch (err) {
      console.error(err);
      // rollback
      setGoals((prev) =>
        prev.map((g) =>
          g._id === goal._id
            ? { ...g, progress: goal.progress, completedAt: goal.completedAt }
            : g
        )
      );
    }
  };

  const handleTaskChange = (index: number, field: string, value: any) => {
    setEditedGoal((prev) => {
      const tasks = [...(prev.tasks || [])];
      tasks[index] = { ...tasks[index], [field]: value };
      return { ...prev, tasks };
    });
  };

  const handleRemoveTask = (index: number) => {
    setEditedGoal((prev) => ({
      ...prev,
      tasks: (prev.tasks || []).filter((_, i) => i !== index),
    }));
  };

  const handleMove = (goal: Goal) => {
    setSelectedGoal(goal);
    setMoveMode(true);
    setEditMode(false);
    setNewStartDate(goal.startDate);
    setNewEndDate(goal.endDate);
  };

  // Delete mit Optimistic-Update + Rollback
  const handleDelete = async (goalId: string) => {
    const snapshot = goals;
    setGoals((p) => p.filter((g) => g._id !== goalId));
    try {
      await deleteGoal(goalId);
    } catch (e) {
      console.error(e);
      // rollback
      setGoals(snapshot);
    }
  };

  // Duplicate – API call, neue Kopie oben einfügen
  const handleDuplicate = async (goalId: string) => {
    try {
      const { goal: copy } = await duplicateGoal(goalId);
      const copyUI = {
        ...copy,
        title: copy.title?.includes("(Kopie)")
          ? copy.title
          : `${copy.title} (Kopie)`,
      };
      setGoals((prev) => [copyUI, ...prev]);
    } catch (e) {
      console.error(e);
    }
  };

  const handleReflect = (goal: Goal) => {
    console.log("Reflexion starten für", goal.title);
  };

  const handleSaveEdit = async () => {
    if (!selectedGoal) return;

    // Optimistisch spiegeln
    const before = selectedGoal;
    setGoals((prev) =>
      prev.map((g) =>
        g._id === before._id ? ({ ...g, ...editedGoal } as Goal) : g
      )
    );

    try {
      await updateGoal({ goalId: selectedGoal._id, ...editedGoal });
    } catch (e) {
      console.error(e);
      // Rollback
      setGoals((prev) => prev.map((g) => (g._id === before._id ? before : g)));
    } finally {
      setSelectedGoal(null);
      setEditMode(false);
    }
  };

  const handleSaveMove = async () => {
    if (!selectedGoal) return;

    // Optimistisch spiegeln
    const before = selectedGoal;
    setGoals((prev) =>
      prev.map((g) =>
        g._id === before._id
          ? ({ ...g, startDate: newStartDate, endDate: newEndDate } as Goal)
          : g
      )
    );

    try {
      await updateGoal({
        goalId: selectedGoal._id,
        startDate: newStartDate,
        endDate: newEndDate,
      });
    } catch (e) {
      console.error(e);
      // Rollback
      setGoals((prev) => prev.map((g) => (g._id === before._id ? before : g)));
    } finally {
      setSelectedGoal(null);
      setMoveMode(false);
    }
  };

  const handleGoalCreated = (goal: Goal) => {
    setGoals((prev) => [...prev, goal]);
  };

  // Kategorisierung – jetzt mit normalizeGoalType
  const categorizeGoals = (all: Goal[]) => {
    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);

    const weekly: Goal[] = [];
    const monthly: Goal[] = [];
    const yearly: Goal[] = [];
    const past: Goal[] = [];
    const mental: Goal[] = [];

    all.forEach((goal) => {
      const start = parseISO(goal.startDate);
      const end = parseISO(goal.endDate);
      if (end < now && (goal.progress ?? 0) < 100) {
        past.push(goal);
        return;
      }

      const type = normalizeGoalType(goal.goalType || (goal as any).type);
      if (type === "weekly") {
        if (
          isWithinInterval(weekStart, { start, end }) ||
          isWithinInterval(weekEnd, { start, end }) ||
          isWithinInterval(now, { start, end })
        ) {
          weekly.push(goal);
        }
      } else if (type === "monthly") {
        if (
          isWithinInterval(now, { start, end }) ||
          isWithinInterval(monthStart, { start, end }) ||
          isWithinInterval(monthEnd, { start, end })
        ) {
          monthly.push(goal);
        }
      } else if (type === "yearly") {
        yearly.push(goal);
      } else if (type === "mental") {
        mental.push(goal);
      }
    });
    return { weekly, monthly, yearly, past, mental };
  };

  const { weekly, monthly, yearly, mental, past } = categorizeGoals(goals);

  if (loading) return <p className="text-center">Ziele werden geladen...</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800">Zielübersicht</h2>
        <Button
          className="border-solid color-blue"
          onClick={() => setOpenSheet(true)}
        >
          Alle Ziele anzeigen
        </Button>
      </div>

      {/* Ansichtsschalter */}
      <div className="flex gap-2 rounded-xl bg-muted p-1 w-fit">
        <Button
          variant={view === "goals" ? "default" : "ghost"}
          onClick={() => setView("goals")}
          aria-pressed={view === "goals"}
        >
          goals
        </Button>
        <Button
          variant={view === "stats" ? "default" : "ghost"}
          onClick={() => setView("stats")}
          aria-pressed={view === "stats"}
        >
          goals stat
        </Button>
        <Button
          variant={view === "history" ? "default" : "ghost"}
          onClick={() => setView("history")}
          aria-pressed={view === "history"}
        >
          goals history
        </Button>
      </div>

      {/* CONTENT */}
      {view === "goals" && (
        <>
          {/* Wochenziele (aktuelle Woche) */}
          <WeeklyGoalsDashboard
            weeklyGoals={weekly}
            onEdit={handleEdit}
            onMove={handleMove}
            onDelete={handleDelete}
            onDuplicate={handleDuplicate}
            onReflect={handleReflect}
            onToggleComplete={handleToggleCompletion}
          />

          {/* Monatsziele (aktueller Monat) */}
          {monthly.length > 0 && (
            <section className="space-y-4">
              <h2 className="text-xl font-semibold">
                📅 Monatsziele (aktueller Monat)
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {monthly.map((goal) => (
                  <GoalCard
                    key={goal._id}
                    goal={goal}
                    onEdit={handleEdit}
                    onMove={handleMove}
                    onDelete={handleDelete}
                    onDuplicate={handleDuplicate}
                    onReflect={handleReflect}
                    onToggleComplete={handleToggleCompletion}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Mentale Ziele (optional) */}
          {mental.length > 0 && (
            <section className="space-y-4">
              <h2 className="text-xl font-semibold">🧠 Mentale Ziele</h2>
              {mental.map((goal) => (
                <GoalCard
                  key={goal._id}
                  goal={goal}
                  onEdit={handleEdit}
                  onMove={handleMove}
                  onDelete={handleDelete}
                  onDuplicate={handleDuplicate}
                  onReflect={handleReflect}
                  onToggleComplete={handleToggleCompletion}
                />
              ))}
            </section>
          )}
        </>
      )}

      {view === "stats" && (
        <section className="space-y-4 rounded-2xl border border-border p-4 shadow-sm
                    bg-white text-gray-900
                    dark:bg-zinc-900 dark:text-zinc-50">
          <h3 className="text-xl font-semibold text-foreground">Ziel-Statistiken (leicht)</h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Wöchentliche Ziele (aktuell)" value={weekly.length} />
            <StatCard label="Monatsziele (akt. Monat)" value={monthly.length} />
            <StatCard label="Jahresziele" value={yearly.length} />
            <StatCard label="Überfällig" value={past.length} />
          </div>
        </section>
      )}

      {view === "history" && (
        <section className="space-y-2">
          <h3 className="text-xl font-semibold">Goals History</h3>
          <p className="text-sm text-muted-foreground">
            Hier kannst du später abgeschlossene und vergangene Ziele
            chronologisch einsehen. (Platzhalter)
          </p>
          <div className="space-y-2">
            {goals
              .filter((g) => (g.progress ?? 0) === 100)
              .sort((a, b) =>
                a.completedAt
                  ? new Date(b.completedAt ?? 0).getTime() -
                  new Date(a.completedAt ?? 0).getTime()
                  : 0
              )
              .slice(0, 5)
              .map((goal) => (
                <GoalCard
                  key={goal._id}
                  goal={goal}
                  onEdit={handleEdit}
                  onMove={handleMove}
                  onDelete={handleDelete}
                  onDuplicate={handleDuplicate}
                  onReflect={handleReflect}
                  onToggleComplete={handleToggleCompletion}
                />
              ))}
          </div>
        </section>
      )}

      {/* Manager Sheet */}
      <FullGoalManagerSheet
        open={openSheet}
        onOpenChange={setOpenSheet}
        filter={filter}
        setFilter={setFilter}
        monthly={monthly}
        yearly={yearly}
        past={past}
        onEdit={handleEdit}
        onMove={handleMove}
        onDelete={handleDelete}
        onDuplicate={handleDuplicate}
        onReflect={handleReflect}
        onGoalCreated={handleGoalCreated}
        onToggleComplete={handleToggleCompletion}
      />

      {/* Ziel erstellen */}
      <GoalCreateSheet onGoalCreated={handleGoalCreated} />

      {selectedGoal && (
        <Dialog open={!!selectedGoal} onOpenChange={() => setSelectedGoal(null)}>
          <DialogContent className="sm:max-w-lg w-[95vw]">
            <DialogHeader>
              <DialogTitle>
                {editMode
                  ? "Ziel bearbeiten"
                  : moveMode
                    ? "Ziel verschieben"
                    : "Ziel"}
              </DialogTitle>
            </DialogHeader>
            {editMode && (
              <>
                <label className="block text-sm font-medium mb-1">Titel</label>
                <input
                  type="text"
                  value={editedGoal.title || ""}
                  onChange={(e) =>
                    setEditedGoal((prev) => ({ ...prev, title: e.target.value }))
                  }
                  className="border p-2 w-full rounded mb-3"
                />
                <label className="block text-sm font-medium mb-1">
                  Beschreibung
                </label>
                <textarea
                  value={editedGoal.description || ""}
                  onChange={(e) =>
                    setEditedGoal((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  className="border p-2 w-full rounded mb-3"
                />
                <label className="block text-sm font-medium mb-1">
                  Startdatum
                </label>
                <input
                  type="date"
                  value={editedGoal.startDate || ""}
                  onChange={(e) =>
                    setEditedGoal((prev) => ({
                      ...prev,
                      startDate: e.target.value,
                    }))
                  }
                  className="border p-2 w-full rounded mb-3"
                />
                {editedGoal.completedAt && (
                  <p className="text-xs text-gray-500 mb-3">
                    Erledigt am{" "}
                    {new Date(editedGoal.completedAt).toLocaleString()}
                  </p>
                )}
                <label className="block text-sm font-medium mb-1">
                  Enddatum
                </label>
                <input
                  type="date"
                  value={editedGoal.endDate || ""}
                  onChange={(e) =>
                    setEditedGoal((prev) => ({
                      ...prev,
                      endDate: e.target.value,
                    }))
                  }
                  className="border p-2 w-full rounded mb-3"
                />
                <label className="block text-sm font-medium mb-1">
                  Zieltyp
                </label>
                <select
                  value={editedGoal.goalType || "weekly"}
                  onChange={(e) =>
                    setEditedGoal((prev) => ({
                      ...prev,
                      goalType: e.target.value as Goal["goalType"],
                    }))
                  }
                  className="border p-2 w-full rounded mb-4"
                >
                  <option value="weekly">Wöchentlich</option>
                  <option value="monthly">Monatlich</option>
                  <option value="yearly">Jährlich</option>
                </select>

                {(editedGoal.tasks as any[])?.map((task: any, idx: number) => (
                  <div key={idx} className="border p-3 rounded mb-3 space-y-1">
                    <input
                      type="text"
                      placeholder="Name"
                      value={task.name || ""}
                      onChange={(e) => handleTaskChange(idx, "name", e.target.value)}
                      className="w-full border rounded p-1"
                    />
                    <input
                      type="text"
                      placeholder="Beschreibung"
                      value={task.description || ""}
                      onChange={(e) =>
                        handleTaskChange(idx, "description", e.target.value)
                      }
                      className="w-full border rounded p-1"
                    />
                    <input
                      type="text"
                      placeholder="Dauer"
                      value={task.duration || ""}
                      onChange={(e) =>
                        handleTaskChange(idx, "duration", e.target.value)
                      }
                      className="w-full border rounded p-1"
                    />
                    <input
                      type="text"
                      placeholder="Farbe"
                      value={task.color || ""}
                      onChange={(e) => handleTaskChange(idx, "color", e.target.value)}
                      className="w-full border rounded p-1"
                    />
                    <input
                      type="time"
                      value={task.time || ""}
                      onChange={(e) => handleTaskChange(idx, "time", e.target.value)}
                      className="w-full border rounded p-1"
                    />
                    <input
                      type="text"
                      placeholder="Kategorie"
                      value={task.category || ""}
                      onChange={(e) =>
                        handleTaskChange(idx, "category", e.target.value)
                      }
                      className="w-full border rounded p-1"
                    />
                    <select
                      value={task.frequency || "once"}
                      onChange={(e) =>
                        handleTaskChange(idx, "frequency", e.target.value)
                      }
                      className="w-full border rounded p-1"
                    >
                      <option value="once">Einmalig</option>
                      <option value="daily">Täglich</option>
                      <option value="weekly">Wöchentlich</option>
                      <option value="monthly">Monatlich</option>
                      <option value="yearly">Jährlich</option>
                    </select>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={task.timebased || false}
                        onChange={(e) =>
                          handleTaskChange(idx, "timebased", e.target.checked)
                        }
                      />
                      <span className="text-sm">Zeitbasiert</span>
                    </div>
                    <input
                      type="date"
                      value={task.dueDate || ""}
                      onChange={(e) =>
                        handleTaskChange(idx, "dueDate", e.target.value)
                      }
                      className="w-full border rounded p-1"
                    />
                    <button
                      type="button"
                      className="text-red-600 text-sm"
                      onClick={() => handleRemoveTask(idx)}
                    >
                      🗑 Aufgabe entfernen
                    </button>
                  </div>
                ))}
                <Button
                  variant="outline"
                  type="button"
                  className="mb-4"
                  onClick={handleAddTask}
                >
                  + Aufgabe hinzufügen
                </Button>
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setSelectedGoal(null)}
                  >
                    Abbrechen
                  </Button>
                  <Button onClick={handleSaveEdit}>Speichern</Button>
                </div>
              </>
            )}
            {moveMode && (
              <>
                <label className="block text-sm font-medium mb-1">
                  Neues Startdatum
                </label>
                <input
                  type="date"
                  value={newStartDate}
                  onChange={(e) => setNewStartDate(e.target.value)}
                  className="border p-2 w-full rounded mb-3"
                />
                <label className="block text-sm font-medium mb-1">
                  Neues Enddatum
                </label>
                <input
                  type="date"
                  value={newEndDate}
                  onChange={(e) => setNewEndDate(e.target.value)}
                  className="border p-2 w-full rounded mb-4"
                />
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setSelectedGoal(null)}
                  >
                    Abbrechen
                  </Button>
                  <Button onClick={handleSaveMove}>Speichern</Button>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border p-4 shadow-sm bg-background">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="text-2xl font-semibold">{value}</div>
    </div>
  );
}
