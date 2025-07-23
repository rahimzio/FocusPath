import React, { useEffect, useState } from "react";
import { Goal, Task } from "@/utils/interface";
import { parseISO, isWithinInterval, startOfWeek, endOfWeek } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

import WeeklyGoalsDashboard from "./WeeklyGoalsDashboard";
import FullGoalManagerSheet from "./FullGoalManagerSheet";
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
  const [filter, setFilter] = useState("all");
  const [openSheet, setOpenSheet] = useState(false);

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
      goalType: goal.goalType || goal.type,
      tasks: goal.tasks ? [...goal.tasks] : [],
    });  };
  const handleAddTask = () => {
  setEditedGoal((prev) => ({
    ...prev,
    tasks: [
      ...(prev.tasks || []),
      {
        name: '',
        description: '',
        duration: '',
        color: '',
        time: '',
        category: '',
        frequency: 'once',
        timebased: false,
        dueDate: '',
        points: 0,
        status: 'todo',
        _id: crypto.randomUUID?.() || Math.random().toString(),
        linkedApps: [],
        subTasks: [],
        excludedDates: [],
      },
    ] as Task[],
  }));
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

  const handleDelete = (goalId: string) => {
    setGoals((prev) => prev.filter((g) => g._id !== goalId));
  };

  const handleDuplicate = (goalId: string) => {
    console.log("Duplicate", goalId);
  };

  const handleReflect = (goal: Goal) => {
    console.log("Reflexion starten für", goal.title);
  };

  const handleSaveEdit = async () => {
    if (!selectedGoal) return;
    await fetch(`/api/goals/updateGoal`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ goalId: selectedGoal._id, ...editedGoal }),
    });
    setSelectedGoal(null);
    setEditMode(false);
  };

  const handleSaveMove = async () => {
    if (!selectedGoal) return;
    await fetch(`/api/goals/updateGoal`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ goalId: selectedGoal._id, startDate: newStartDate, endDate: newEndDate }),
    });
    setSelectedGoal(null);
    setMoveMode(false);
  };

  const handleGoalCreated = (goal: Goal) => {
    setGoals((prev) => [...prev, goal]);
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

  if (loading) return <p className="text-center">Ziele werden geladen...</p>;

  return (
    <div className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-800">Zielübersicht</h2>
      <div className="flex justify-between items-center">
        <Button className="border-solid color-blue"  onClick={() => setOpenSheet(true)}>Alle Ziele anzeigen</Button>
      </div>

      <WeeklyGoalsDashboard
        weeklyGoals={weekly}
        onEdit={handleEdit}
        onMove={handleMove}
        onDelete={handleDelete}
        onDuplicate={handleDuplicate}
        onReflect={handleReflect}
      />

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
      />

      {/* Ziel erstellen (fest verankert unten rechts) */}
      <GoalCreateSheet onGoalCreated={handleGoalCreated} />

      {selectedGoal && (
        <Dialog open={!!selectedGoal} onOpenChange={() => setSelectedGoal(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editMode ? "Ziel bearbeiten" : moveMode ? "Ziel verschieben" : "Ziel"}</DialogTitle>
            </DialogHeader>
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
                  className="border p-2 w-full rounded mb-3"
                />
                <label className="block text-sm font-medium mb-1">Startdatum</label>
                <input
                  type="date"
                  value={editedGoal.startDate || ""}
                  onChange={(e) => setEditedGoal((prev) => ({ ...prev, startDate: e.target.value }))}
                  className="border p-2 w-full rounded mb-3"
                />
                <label className="block text-sm font-medium mb-1">Enddatum</label>
                <input
                  type="date"
                  value={editedGoal.endDate || ""}
                  onChange={(e) => setEditedGoal((prev) => ({ ...prev, endDate: e.target.value }))}
                  className="border p-2 w-full rounded mb-3"
                />
                <label className="block text-sm font-medium mb-1">Zieltyp</label>
                <select
                  value={editedGoal.goalType || "weekly"}
                  onChange={(e) => setEditedGoal((prev) => ({ ...prev, goalType: e.target.value as Goal["goalType"] }))}
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
                      onChange={(e) => handleTaskChange(idx, 'name', e.target.value)}
                      className="w-full border rounded p-1"
                    />
                    <input
                      type="text"
                      placeholder="Beschreibung"
                      value={task.description || ""}
                      onChange={(e) => handleTaskChange(idx, 'description', e.target.value)}
                      className="w-full border rounded p-1"
                    />
                    <input
                      type="text"
                      placeholder="Dauer"
                      value={task.duration || ""}
                      onChange={(e) => handleTaskChange(idx, 'duration', e.target.value)}
                      className="w-full border rounded p-1"
                    />
                    <input
                      type="text"
                      placeholder="Farbe"
                      value={task.color || ""}
                      onChange={(e) => handleTaskChange(idx, 'color', e.target.value)}
                      className="w-full border rounded p-1"
                    />
                    <input
                      type="time"
                      value={task.time || ""}
                      onChange={(e) => handleTaskChange(idx, 'time', e.target.value)}
                      className="w-full border rounded p-1"
                    />
                    <input
                      type="text"
                      placeholder="Kategorie"
                      value={task.category || ""}
                      onChange={(e) => handleTaskChange(idx, 'category', e.target.value)}
                      className="w-full border rounded p-1"
                    />
                    <select
                      value={task.frequency || 'once'}
                      onChange={(e) => handleTaskChange(idx, 'frequency', e.target.value)}
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
                        onChange={(e) => handleTaskChange(idx, 'timebased', e.target.checked)}
                      />
                      <span className="text-sm">Zeitbasiert</span>
                    </div>
                    <input
                      type="date"
                      value={task.dueDate || ''}
                      onChange={(e) => handleTaskChange(idx, 'dueDate', e.target.value)}
                      className="w-full border rounded p-1"
                    />
                    <button type="button" className="text-red-600 text-sm" onClick={() => handleRemoveTask(idx)}>
                      🗑 Aufgabe entfernen
                    </button>
                  </div>
                ))}
                <Button variant="outline" type="button" className="mb-4" onClick={handleAddTask}>
                  + Aufgabe hinzufügen
                </Button>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setSelectedGoal(null)}>Abbrechen</Button>
                  <Button onClick={handleSaveEdit}>Speichern</Button>
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
                  <Button variant="outline" onClick={() => setSelectedGoal(null)}>Abbrechen</Button>
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
