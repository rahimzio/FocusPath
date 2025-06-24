import React, { useEffect, useState } from "react";
import { Goal } from "@/utils/interface";
import {
    format,
    parseISO,
    getMonth,
    isWithinInterval,
    startOfWeek,
    endOfWeek,
    addWeeks,
} from "date-fns";
import { isNextMonth } from "@/utils/goals/helper";
import GoalManager from "./GoalManager";
import MonthlyGoalOverview from "./MonthlyGoalOverview";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export default function GoalOverviewDashboard() {
    const [goals, setGoals] = useState<Goal[]>([]);
    const [loading, setLoading] = useState(true);
    const [showGoalManager, setShowGoalManager] = useState(false);
    const [showMonthlyOverview, setShowMonthlyOverview] = useState(false);
    const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
    const [editMode, setEditMode] = useState(false);
    const [moveMode, setMoveMode] = useState(false);
    const [editedGoal, setEditedGoal] = useState<Partial<Goal>>({});
    const [newStartDate, setNewStartDate] = useState("");
    const [newEndDate, setNewEndDate] = useState("");

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
                .then((res) => res.json())
                .then((data) => {
                    console.log("✅ Ziele geladen:", data.goals);
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
                        ? {
                            ...g,
                            progress: newProgress,
                            completedAt: completedAt ?? undefined,
                        }
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
            body: JSON.stringify({
                goalId: selectedGoal._id,
                ...editedGoal,
            }),
        });

        alert("Ziel aktualisiert. Änderungen werden beim nächsten Laden sichtbar.");
        setSelectedGoal(null);
        setEditMode(false);
    };

    const handleMove = async () => {
        if (!selectedGoal) return;

        await fetch(`/api/goals/updateGoal`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                goalId: selectedGoal._id,
                startDate: newStartDate,
                endDate: newEndDate,
            }),
        });

        alert("Ziel wurde verschoben.");
        setSelectedGoal(null);
        setMoveMode(false);
    };

    const categorizeGoals = (goals: Goal[]) => {
        const currentWeek: Goal[] = [];
        const currentMonth: Goal[] = [];
        const nextWeek: Goal[] = [];
        const nextMonth: Goal[] = [];
        const monthlyByMonth: { [month: number]: Goal[] } = {};

        const today = new Date();
        const thisWeekStart = startOfWeek(today, { weekStartsOn: 1 });
        const thisWeekEnd = endOfWeek(today, { weekStartsOn: 1 });
        const nextWeekStart = startOfWeek(addWeeks(today, 1), { weekStartsOn: 1 });
        const nextWeekEnd = endOfWeek(addWeeks(today, 1), { weekStartsOn: 1 });

        goals.forEach((goal) => {
            const start = parseISO(goal.startDate);
            const end = parseISO(goal.endDate);
            const goalType = goal.goalType ?? goal.type ?? "";

            if (
                isWithinInterval(start, { start: thisWeekStart, end: thisWeekEnd }) ||
                isWithinInterval(end, { start: thisWeekStart, end: thisWeekEnd })
            ) {
                currentWeek.push(goal);
            } else if (
                isWithinInterval(start, { start: nextWeekStart, end: nextWeekEnd }) ||
                isWithinInterval(end, { start: nextWeekStart, end: nextWeekEnd })
            ) {
                nextWeek.push(goal);
            }

            if (goalType === "monthly") {
                const now = new Date();
                const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
                const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

                if (
                    isWithinInterval(start, { start: currentMonthStart, end: currentMonthEnd }) ||
                    isWithinInterval(end, { start: currentMonthStart, end: currentMonthEnd })
                ) {
                    currentMonth.push(goal);
                } else if (isNextMonth(start)) nextMonth.push(goal);

                const month = getMonth(start);
                if (!monthlyByMonth[month]) monthlyByMonth[month] = [];
                monthlyByMonth[month].push(goal);
            }
        });

        return { currentWeek, currentMonth, nextWeek, nextMonth, monthlyByMonth };
    };

    const { currentWeek, currentMonth, nextWeek, nextMonth, monthlyByMonth } = categorizeGoals(goals);

    const renderGoal = (goal: Goal, isFuture = false) => (
        <div
            key={goal._id}
            className={`p-3 border rounded mb-2 bg-white shadow ${goal.progress === 100 ? "opacity-60" : ""}`}
        >
            <div className="flex items-center gap-2">
                <input
                    type="checkbox"
                    checked={goal.progress === 100}
                    onChange={() => handleToggleGoalCompletion(goal)}
                    className="h-4 w-4"
                />
                <h4 className="font-semibold text-lg text-gray-900">{goal.title}</h4>
            </div>
            <p className="text-sm text-gray-700 mb-1">{goal.description}</p>
            <p className="text-sm text-gray-500">
                {format(parseISO(goal.startDate), "dd.MM.yyyy")} – {format(parseISO(goal.endDate), "dd.MM.yyyy")}
            </p>
            {goal.progress === 100 && goal.completedAt && (
                <p className="text-xs text-green-600 italic">
                    ✅ Erledigt am {format(parseISO(goal.completedAt), "dd.MM.yyyy")}
                </p>
            )}
            <div className="mt-2 flex flex-wrap gap-2">
                <button className="text-sm bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700" onClick={() => openEditDialog(goal)}>✏️ Bearbeiten</button>
                <button className="text-sm bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700" onClick={() => openMoveDialog(goal)}>📤 Verschieben</button>
            </div>
        </div>
    );

    if (loading) return <p>Ziele werden geladen...</p>;

    return (
        <div className="space-y-10">
            <section>
                <h2 className="text-xl font-bold text-gray-800 mb-2">🟢 Aktuelle Woche</h2>
                {currentWeek.length > 0 ? currentWeek.map(g => renderGoal(g)) : <p className="text-sm text-gray-500 italic">Keine Wochenziele</p>}
            </section>

            <section>
                <h2 className="text-xl font-bold text-gray-800 mb-2">🔵 Aktueller Monat</h2>
                {currentMonth.length > 0 ? currentMonth.map(g => renderGoal(g)) : <p className="text-sm text-gray-500 italic">Keine Monatsziele</p>}
            </section>

            <section>
                <h2 className="text-xl font-bold text-gray-800 mt-6 mb-2">🕓 Nächste Woche</h2>
                {nextWeek.length > 0 ? nextWeek.map(g => renderGoal(g, true)) : <p className="text-sm text-gray-500 italic">Keine geplanten Wochenziele</p>}
            </section>

            <section>
                <h2 className="text-xl font-bold text-gray-800 mb-2">🗓️ Nächster Monat</h2>
                {nextMonth.length > 0 ? nextMonth.map(g => renderGoal(g, true)) : <p className="text-sm text-gray-500 italic">Keine geplanten Monatsziele</p>}
            </section>

            <section>
                <h2 className="text-xl font-bold text-gray-800 mb-2">📅 Monatsübersicht (alle Monatsziele)</h2>
                <button
                    className="mb-4 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                    onClick={() => setShowMonthlyOverview(true)}
                >
                    Monatsübersicht anzeigen
                </button>

                {showMonthlyOverview && (
                    <MonthlyGoalOverview
                        goals={goals.filter((g) => g.goalType === "monthly")}
                        onClose={() => setShowMonthlyOverview(false)}
                    />
                )}
            </section>

            <section>
                <h2 className="text-xl font-bold text-gray-800 mb-2">➕ Ziel erstellen & verwalten</h2>
                <button
                    className="mb-4 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                    onClick={() => setShowGoalManager(!showGoalManager)}
                >
                    {showGoalManager ? "Verbergen" : "Ziel erstellen"}
                </button>
                {showGoalManager && <GoalManager />}
            </section>

            {selectedGoal && (
                <Dialog open={!!selectedGoal} onOpenChange={() => setSelectedGoal(null)}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>
                                {editMode ? "Ziel bearbeiten" : moveMode ? "Ziel verschieben" : "Ziel"}
                            </DialogTitle>
                        </DialogHeader>
                        <>
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

                                    <label className="block text-sm font-medium mb-1">Beschreibung</label>
                                    <textarea
                                        value={editedGoal.description || ""}
                                        onChange={(e) =>
                                            setEditedGoal((prev) => ({ ...prev, description: e.target.value }))
                                        }
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
