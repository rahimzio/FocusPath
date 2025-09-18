"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Goal, Task } from "@/utils/interface";
import {
  parseISO,
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

/** UI-Ansichten */
type ViewMode = "goals" | "stats" | "history";
/** Filter für FullGoalManagerSheet */
type FilterType = "all" | "monthly" | "yearly" | "past";

export default function GoalOverviewDashboard() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialog/Editor Zustände
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [moveMode, setMoveMode] = useState(false);
  const [editedGoal, setEditedGoal] = useState<Partial<Goal>>({});
  const [newStartDate, setNewStartDate] = useState("");
  const [newEndDate, setNewEndDate] = useState("");

  // Manager-Sheet
  const [filter, setFilter] = useState<FilterType>("all");
  const [openSheet, setOpenSheet] = useState(false);

  const [view, setView] = useState<ViewMode>("goals");

  useEffect(() => {
    let abort = false;
    const fetchGoals = async () => {
      try {
        const sessionRes = await fetch("/api/auth/session");
        const session = await sessionRes.json();
        const userId = session?.user?.id;
        if (!userId || abort) return;

        const res = await fetch(`/api/goals/getGoals?userId=${userId}`);
        const data = await res.json();
        if (abort) return;
        setGoals(Array.isArray(data.goals) ? data.goals : []);
      } catch (err) {
        console.error("Fehler beim Laden der Ziele", err);
      } finally {
        if (!abort) setLoading(false);
      }
    };
    fetchGoals();
    return () => {
      abort = true;
    };
  }, []);

  /** Edit vorbereiten */
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
      progress: goal.progress,
    });
  };

  /** Neue Aufgabe im Edit-Dialog hinzufügen (lokal) */
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

  /** Toggle abgeschlossen (optimistisch) */
  const handleToggleCompletion = async (goal: Goal) => {
    const nextProgress = goal.progress === 100 ? 0 : 100;
    const completedAt = nextProgress === 100 ? new Date().toISOString() : null;

    // Optimistic UI
    const prev = goals;
    setGoals((p) =>
      p.map((g) =>
        g._id === goal._id
          ? { ...g, progress: nextProgress, completedAt: completedAt ?? undefined }
          : g
      )
    );

    try {
      await patchGoalProgress(goal._id, nextProgress, completedAt);
    } catch (err) {
      console.error(err);
      // Rollback
      setGoals(prev);
    }
  };

  /** Task-Felder im Edit-Dialog ändern */
  const handleTaskChange = (index: number, field: string, value: any) => {
    setEditedGoal((prev) => {
      const tasks = [...(prev.tasks || [])];
      tasks[index] = { ...(tasks[index] || {}), [field]: value };
      return { ...prev, tasks };
    });
  };

  const handleRemoveTask = (index: number) => {
    setEditedGoal((prev) => ({
      ...prev,
      tasks: (prev.tasks || []).filter((_, i) => i !== index),
    }));
  };

  /** Move vorbereiten */
  const handleMove = (goal: Goal) => {
    setSelectedGoal(goal);
    setMoveMode(true);
    setEditMode(false);
    setNewStartDate(goal.startDate);
    setNewEndDate(goal.endDate);
  };

  /** Löschen (optimistisch) */
  const handleDelete = async (goalId: string) => {
    const snapshot = goals;
    setGoals((p) => p.filter((g) => g._id !== goalId));
    try {
      await deleteGoal(goalId);
    } catch (e) {
      console.error(e);
      setGoals(snapshot);
    }
  };

  /** Duplizieren */
  const handleDuplicate = async (goalId: string) => {
    try {
      const { goal: copy } = await duplicateGoal(goalId);
      const copyUI = {
        ...copy,
        title: copy.title?.includes("(Kopie)") ? copy.title : `${copy.title} (Kopie)`,
      };
      setGoals((prev) => [copyUI, ...prev]);
    } catch (e) {
      console.error(e);
    }
  };

  const handleReflect = (goal: Goal) => {
    // Platzhalter: hier ggf. Reflexionsflow öffnen
    console.log("Reflexion starten für", goal.title);
  };

  /** Edit speichern */
  const handleSaveEdit = async () => {
    if (!selectedGoal) return;

    const before = selectedGoal;
    // Optimistisch in der Liste spiegeln
    setGoals((prev) =>
      prev.map((g) => (g._id === before._id ? ({ ...g, ...editedGoal } as Goal) : g))
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

  /** Move speichern */
  const handleSaveMove = async () => {
    if (!selectedGoal) return;

    const before = selectedGoal;
    // Optimistisch
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

  /** Nach Erstellung Ziel in Liste aufnehmen */
  const handleGoalCreated = (goal: Goal) => {
    setGoals((prev) => [...prev, goal]);
  };

  /** Kategorisierung – robust und übersichtlich */
  const categorizeGoals = (
    all: Goal[]
  ): { weekly: Goal[]; monthly: Goal[]; yearly: Goal[]; past: Goal[]; mental: Goal[] } => {
    const now = new Date();
    const wStart = startOfWeek(now, { weekStartsOn: 1 });
    const wEnd = endOfWeek(now, { weekStartsOn: 1 });
    const mStart = startOfMonth(now);
    const mEnd = endOfMonth(now);

    const weekly: Goal[] = [];
    const monthly: Goal[] = [];
    const yearly: Goal[] = [];
    const past: Goal[] = [];
    const mental: Goal[] = [];

    const overlaps = (rangeStart: Date, rangeEnd: Date, start: Date, end: Date) =>
      end >= rangeStart && start <= rangeEnd;

    for (const goal of all ?? []) {
      const start = parseISO(goal.startDate);
      const end = parseISO(goal.endDate);

      // abgelaufen (und nicht 100%)
      if (end.getTime() < now.getTime() && (goal.progress ?? 0) < 100) {
        past.push(goal);
        continue;
      }

      const type = normalizeGoalType(goal.goalType || (goal as any).type);

      if (type === "weekly") {
        if (overlaps(wStart, wEnd, start, end)) weekly.push(goal);
      } else if (type === "monthly") {
        if (overlaps(mStart, mEnd, start, end)) monthly.push(goal);
      } else if (type === "yearly") {
        yearly.push(goal);
      } else if (type === "mental") {
        mental.push(goal);
      }
    }

    return { weekly, monthly, yearly, past, mental };
  };
  const { weekly, monthly, yearly, mental, past } = useMemo(
    () => categorizeGoals(goals),
    [goals]
  );

  if (loading) {
    return (
      <div className="rounded-xl border bg-white p-4 shadow-sm">
        <p className="text-sm text-gray-600">Ziele werden geladen…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Sichtbarer, einheitlicher Header */}
      <div
        className="
          flex flex-wrap items-center justify-between gap-3
          rounded-2xl border shadow-sm
          px-4 py-3 sm:px-6
          bg-gradient-to-r from-slate-50 to-slate-100
          dark:from-zinc-800 dark:to-zinc-800
        "
      >
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-zinc-50">
          Zielübersicht
        </h2>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setOpenSheet(true)}
            className="shadow-sm"
          >
            Alle Ziele anzeigen
          </Button>
        </div>
      </div>

      {/* Ansichtsschalter – gut abgesetzt sichtbar */}
      <div
        className="
          flex flex-wrap gap-2 w-fit p-1 rounded-xl border
          bg-slate-50 text-slate-800
          dark:bg-zinc-800 dark:text-zinc-50
        "
      >
        <Button
          variant={view === "goals" ? "default" : "ghost"}
          onClick={() => setView("goals")}
          aria-pressed={view === "goals"}
        >
          Ziele
        </Button>
        <Button
          variant={view === "stats" ? "default" : "ghost"}
          onClick={() => setView("stats")}
          aria-pressed={view === "stats"}
        >
          Statistik
        </Button>
        <Button
          variant={view === "history" ? "default" : "ghost"}
          onClick={() => setView("history")}
          aria-pressed={view === "history"}
        >
          Historie
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
              <h2 className="text-lg sm:text-xl font-semibold text-slate-900 dark:text-zinc-50">
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
              <h2 className="text-lg sm:text-xl font-semibold text-slate-900 dark:text-zinc-50">
                🧠 Mentale Ziele
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
              </div>
            </section>
          )}
        </>
      )}

      {view === "stats" && (
        <section
          className="space-y-4 rounded-2xl border border-border p-4 shadow-sm
                     bg-white text-gray-900
                     dark:bg-zinc-900 dark:text-zinc-50"
        >
          <h3 className="text-xl font-semibold text-foreground">Ziel-Statistiken</h3>
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
          <h3 className="text-xl font-semibold text-slate-900 dark:text-zinc-50">
            Historie (abgeschlossen)
          </h3>
          <p className="text-sm text-muted-foreground">
            Zuletzt abgeschlossene Ziele (Top 5).
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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

      {/* Manager Sheet – alle Ziele mit Filtern */}
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

      {/* FAB: Neues Ziel */}
      <GoalCreateSheet onGoalCreated={handleGoalCreated} />

      {/* Bearbeiten/Verschieben Dialog */}
      {selectedGoal && (
        <Dialog
          open={!!selectedGoal}
          onOpenChange={(o) => {
            if (!o) setSelectedGoal(null);
          }}
        >
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

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
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
                      className="border p-2 w-full rounded"
                    />
                  </div>
                  <div>
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
                      className="border p-2 w-full rounded"
                    />
                  </div>
                </div>

                {editedGoal.completedAt && (
                  <p className="text-xs text-gray-500 mt-2">
                    Erledigt am{" "}
                    {new Date(editedGoal.completedAt).toLocaleString()}
                  </p>
                )}

                <label className="block text-sm font-medium mb-1 mt-3">
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
                  <div key={task?._id || idx} className="border p-3 rounded mb-3 space-y-1">
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

                <div className="flex flex-wrap justify-end gap-2">
                  <Button variant="outline" onClick={() => setSelectedGoal(null)}>
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
                <div className="flex flex-wrap justify-end gap-2">
                  <Button variant="outline" onClick={() => setSelectedGoal(null)}>
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
