import React, { useEffect, useState } from "react";
import { Goal } from "@/utils/interface";
import {
    format,
    isThisMonth,
    parseISO,
    getMonth,
    isWithinInterval,
    startOfWeek,
    endOfWeek,
    addWeeks,
} from "date-fns";
import { isNextMonth } from "@/utils/goals/helper";
import GoalManager from "./GoalManager";
import GoalEditModal from "./GoalEditModal";
import GoalCategoryManager from "./GoalCategoryManager";

interface Category {
    _id: string;
    name: string;
}

export default function GoalOverviewDashboard() {
    const [goals, setGoals] = useState<Goal[]>([]);
    const [loading, setLoading] = useState(true);
    const [showGoalManager, setShowGoalManager] = useState(false);
    const [showMonthlyOverview, setShowMonthlyOverview] = useState(false);
    const [editGoal, setEditGoal] = useState<Goal | null>(null);

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

    const toggleGoalCompletion = async (goal: Goal) => {
        const newProgress = goal.progress === 100 ? 0 : 100;
        const completedAt = newProgress === 100 ? new Date().toISOString() : null;

        try {
            await fetch("/api/goals/updateGoalProgress", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ goalId: goal._id, progress: newProgress, completedAt }),
            });

            setGoals((prev) =>
                prev.map((g) =>
                    g._id === goal._id ? { ...g, progress: newProgress, completedAt: completedAt ?? undefined } : g
                )
            );
        } catch (err) {
            console.error("❌ Fehler beim Abhaken des Ziels:", err);
        }
    };
    const handleShiftToCurrentWeek = async (goal: Goal) => {
        try {
            const sessionRes = await fetch("/api/auth/session");
            const session = await sessionRes.json();
            const userId = session?.user?.id;
            if (!userId) return;

            const response = await fetch("/api/goals/shiftToCurrentWeek", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ goalId: goal._id, userId }),
            });

            if (!response.ok) throw new Error("Kopieren fehlgeschlagen");

            const data = await response.json();
            setGoals((prev) => [...prev, data.newGoal]);
        } catch (err) {
            console.error("❌ Fehler beim Verschieben in aktuelle Woche:", err);
        }
    };

    const handleSaveEditedGoal = async (updatedGoal: Partial<Goal>) => {
        try {
            const sessionRes = await fetch("/api/auth/session");
            const session = await sessionRes.json();
            const userId = session?.user?.id;

            if (!userId || !updatedGoal._id || !updatedGoal.title || !updatedGoal.description) {
                console.error("❌ Ungültige Daten für Update:", { updatedGoal, userId });
                return;
            }

            const response = await fetch("/api/goals/updateGoal", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    goalId: updatedGoal._id,
                    title: updatedGoal.title,
                    description: updatedGoal.description,
                    userId,
                }),
            });

            if (!response.ok) throw new Error("Update fehlgeschlagen");

            setGoals((prev) =>
                prev.map((goal) =>
                    goal._id === updatedGoal._id ? { ...goal, ...updatedGoal } : goal
                )
            );
            setEditGoal(null);
        } catch (err) {
            console.error("Fehler beim Speichern:", err);
        }
    };
    const handleDeleteGoal = async (goalId: string) => {
        const confirmed = confirm("Möchtest du dieses Ziel wirklich löschen?");
        if (!confirmed) return;

        try {
            const sessionRes = await fetch("/api/auth/session");
            const session = await sessionRes.json();
            const userId = session?.user?.id;

            if (!userId) return;

            const res = await fetch("/api/goals/deleteGoal", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ goalId, userId }),
            });

            if (!res.ok) throw new Error("Löschen fehlgeschlagen");

            setGoals((prev) => prev.filter((goal) => goal._id !== goalId));
        } catch (error) {
            console.error("❌ Fehler beim Löschen:", error);
        }
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
            const goalType = goal.type || goal.goalType || "";

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
                if (isThisMonth(start)) currentMonth.push(goal);
                else if (isNextMonth(start)) nextMonth.push(goal);

                const month = getMonth(start);
                if (!monthlyByMonth[month]) monthlyByMonth[month] = [];
                monthlyByMonth[month].push(goal);
            }
        });

        return { currentWeek, currentMonth, nextWeek, nextMonth, monthlyByMonth };
    };

    const { currentWeek, currentMonth, nextWeek, nextMonth, monthlyByMonth } = categorizeGoals(goals);

    const renderGoal = (goal: Goal, isFuture = false) => (
        <div key={goal._id} className={`p-3 border rounded mb-2 bg-white shadow ${goal.progress === 100 ? "opacity-60" : ""}`}>
            <div className="flex items-center gap-2">
                <input
                    type="checkbox"
                    checked={goal.progress === 100}
                    onChange={() => toggleGoalCompletion(goal)}
                    className="h-4 w-4"
                />
                <h4 className="font-semibold text-lg text-gray-900">{goal.title}</h4>
            </div>
            <p className="text-sm text-gray-700 mb-1">{goal.description}</p>
            <p className="text-sm text-gray-500">
                {format(parseISO(goal.startDate), "dd.MM.yyyy")} – {format(parseISO(goal.endDate), "dd.MM.yyyy")}
            </p>
            {goal.parentGoalId && (
                <p className="text-xs text-blue-500 italic">Teil von: {goal.parentGoalTitle || "übergeordnetes Ziel"}</p>
            )}
            {goal.progress === 100 && goal.completedAt && (
                <p className="text-xs text-green-600 italic">
                    ✅ Erledigt am {format(parseISO(goal.completedAt), "dd.MM.yyyy")}
                </p>
            )}
            <div className="mt-2 flex flex-wrap gap-2">
                <button className="text-sm bg-gray-200 hover:bg-gray-300 text-gray-900 px-2 py-1 rounded" onClick={() => setEditGoal(goal)}>✏️ Bearbeiten</button>
                <button className="text-sm bg-gray-200 hover:bg-gray-300 text-gray-900 px-2 py-1 rounded" onClick={() => setEditGoal(goal)}>📤 Verschieben</button>
                <button className="text-sm bg-gray-200 hover:bg-gray-300 text-gray-900 px-2 py-1 rounded" onClick={() => alert("Vorlage: " + goal.title)}>✅ Als Vorlage</button>
                <button
                    className="text-sm bg-red-100 hover:bg-red-200 text-red-800 px-2 py-1 rounded"
                    onClick={() => handleDeleteGoal(goal._id)}
                >
                    🗑️ Löschen
                </button>

                {isFuture && goal.progress !== 100 && (
                    <button
                        className="text-sm bg-orange-100 hover:bg-orange-200 text-orange-800 px-2 py-1 rounded"
                        onClick={() => handleShiftToCurrentWeek(goal)}
                    >
                        ➕ In aktuelle Woche
                    </button>
                )}
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
                <h2 className="text-xl font-bold text-gray-800 mb-2">🕓 Nächste Woche</h2>
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
                    onClick={() => setShowMonthlyOverview(!showMonthlyOverview)}
                >
                    {showMonthlyOverview ? "Verbergen" : "Monatsübersicht anzeigen"}
                </button>
                {showMonthlyOverview && (
                    <div className="mt-4">
                        {Object.entries(monthlyByMonth).map(([month, goals]) => (
                            <div key={month} className="mb-6">
                                <h3 className="text-lg font-semibold text-gray-700 mb-2">
                                    {new Date(2025, Number(month)).toLocaleString("de-DE", { month: "long" })}
                                </h3>
                                {goals.map(g => renderGoal(g))}
                            </div>
                        ))}
                    </div>
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

            <section>
                <GoalCategoryManager />
            </section>

            {editGoal && (
                <GoalEditModal goal={editGoal} onClose={() => setEditGoal(null)} onSave={handleSaveEditedGoal} />
            )}
        </div>
    );
}
