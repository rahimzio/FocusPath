import React, { useEffect, useState } from "react";
import { Goal } from "@/utils/interface";
import {
  format,
  parseISO,
  getMonth,
  getYear,
  startOfMonth,
  endOfMonth,
  isWithinInterval,
  addMonths,
  subMonths,
  startOfWeek,
  endOfWeek,
} from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface Props {
  goals: Goal[];
  onClose: () => void;
}

export default function MonthlyGoalOverview({ goals, onClose }: Props) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editedGoal, setEditedGoal] = useState<Partial<Goal>>({});

  const handlePrevMonth = () => setCurrentMonth((prev) => subMonths(prev, 1));
  const handleNextMonth = () => setCurrentMonth((prev) => addMonths(prev, 1));

  const getWeeksInMonth = (date: Date): { start: Date; end: Date }[] => {
    const start = startOfMonth(date);
    const end = endOfMonth(date);
    const weeks: { start: Date; end: Date }[] = [];
    let current = startOfWeek(start, { weekStartsOn: 1 });

    while (current <= end) {
      const weekEnd = endOfWeek(current, { weekStartsOn: 1 });
      weeks.push({ start: current, end: weekEnd });
      current = new Date(current.setDate(current.getDate() + 7));
    }

    return weeks;
  };

  const filteredGoals = goals.filter((goal) => {
    const start = parseISO(goal.startDate);
    return getMonth(start) === getMonth(currentMonth) && getYear(start) === getYear(currentMonth);
  });

  const weeks = getWeeksInMonth(currentMonth);

  const handleToggleCompletion = async (goal: Goal) => {
    const newProgress = goal.progress === 100 ? 0 : 100;
    const completedAt = newProgress === 100 ? new Date().toISOString() : null;

    await fetch(`/api/goals/updateGoalProgress`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        goalId: goal._id,
        progress: newProgress,
        completedAt,
      }),
    });

    alert("Zielstatus aktualisiert. Änderungen beim nächsten Laden sichtbar.");
  };

  const openDialog = (goal: Goal, mode: "view" | "edit") => {
    setSelectedGoal(goal);
    setEditMode(mode === "edit");
    setEditedGoal({ title: goal.title, description: goal.description });
  };

  const handleSave = async () => {
    if (!selectedGoal) return;
    await fetch(`/api/goals/updateGoal?goalId=${selectedGoal._id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editedGoal),
    });
    alert("Ziel wurde aktualisiert. Änderungen werden beim nächsten Laden sichtbar.");
    setSelectedGoal(null);
    setEditMode(false);
  };

  return (
    <div className="fixed inset-0 bg-white z-50 overflow-y-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <button onClick={handlePrevMonth} className="text-blue-600">⏪</button>
        <h2 className="text-2xl font-bold">
          📅 Monatsziele: {format(currentMonth, "MMMM yyyy")}
        </h2>
        <button onClick={handleNextMonth} className="text-blue-600">⏩</button>
      </div>

      {weeks.map((week, index) => {
        const weekGoals = filteredGoals.filter((goal) => {
          const goalDate = parseISO(goal.startDate);
          return isWithinInterval(goalDate, { start: week.start, end: week.end });
        });

        const completedCount = weekGoals.filter((g) => g.progress === 100).length;
        const percentage = weekGoals.length > 0 ? Math.round((completedCount / weekGoals.length) * 100) : 0;

        return (
          <div key={index} className="border rounded p-3 shadow mb-6">
            <h4 className="font-semibold text-gray-700 mb-2">
              Woche {index + 1}: {format(week.start, "dd.MM")} – {format(week.end, "dd.MM")} 
              ({completedCount}/{weekGoals.length} erledigt – {percentage}%)
            </h4>
            {weekGoals.length > 0 ? (
              <ul className="space-y-2">
                {weekGoals.map((goal) => (
                  <li key={goal._id} className={`border p-3 rounded bg-gray-50 ${goal.progress === 100 ? "opacity-60" : ""}`}>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={goal.progress === 100}
                        onChange={() => handleToggleCompletion(goal)}
                        className="h-4 w-4"
                      />
                      <span className="font-semibold text-gray-800">{goal.title}</span>
                      <span className="text-sm text-gray-500">({goal.progress}%)</span>
                    </div>
                    <p className="text-sm text-gray-600">{goal.description}</p>
                    <p className="text-xs text-gray-500">
                      {format(parseISO(goal.startDate), "dd.MM.yyyy")} – {format(parseISO(goal.endDate), "dd.MM.yyyy")}
                    </p>
                    <div className="mt-2 flex gap-2">
                      <Button variant="outline" onClick={() => openDialog(goal, "view")} className="text-sm bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700">
                        🔍 Details
                      </Button>
                      <Button variant="outline" onClick={() => openDialog(goal, "edit")} className="text-sm bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700">
                        ✏️ Bearbeiten
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm italic text-gray-500">Keine Ziele in dieser Woche.</p>
            )}
          </div>
        );
      })}

      <Dialog open={!!selectedGoal} onOpenChange={() => setSelectedGoal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editMode ? "Ziel bearbeiten" : "Ziel-Details"}
            </DialogTitle>
          </DialogHeader>

          {selectedGoal && (
            <>
              {editMode ? (
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

                  <label className="block text-sm font-medium mb-1">Beschreibung</label>
                  <textarea
                    value={editedGoal.description || ""}
                    onChange={(e) =>
                      setEditedGoal((prev) => ({ ...prev, description: e.target.value }))
                    }
                    className="border p-2 w-full rounded mb-4"
                  />

                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setEditMode(false)}>Abbrechen</Button>
                    <Button onClick={handleSave}>Speichern</Button>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-lg font-semibold mb-1">{selectedGoal.title}</p>
                  <p className="text-sm text-gray-700 mb-2">{selectedGoal.description}</p>
                  <p className="text-xs text-gray-500 mb-4">
                    Zeitraum: {format(parseISO(selectedGoal.startDate), "dd.MM.yyyy")} – {format(parseISO(selectedGoal.endDate), "dd.MM.yyyy")}
                  </p>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setSelectedGoal(null)}>Schließen</Button>
                    <Button onClick={() => setEditMode(true)}>Bearbeiten</Button>
                  </div>
                </>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
