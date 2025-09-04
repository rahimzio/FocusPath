import React, { useEffect, useState } from "react";
import { CreateTaskBody, Goal } from "@/utils/interface";
import { getSession } from "next-auth/react";
import { createGoal } from "@/lib/api/goal";
import { mergeCreatedGoal, computeGoalProgress } from "@/utils/goals/progress";
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";

interface Props {
  onGoalCreated: (goal: Goal) => void;
}

const NewGoalForm: React.FC<Props> = ({ onGoalCreated }) => {
  const [userId, setUserId] = useState<string>("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [type, setType] = useState<"once" | "daily" | "weekly" | "monthly" | "yearly" | "mental">("monthly");
  const [recurring, setRecurring] = useState<boolean>(false); // Wiederholung ja/nein
  const [tasks, setTasks] = useState<CreateTaskBody[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [category, setCategory] = useState<string>("");

  useEffect(() => {
    const fetchUserId = async () => {
      const session = await getSession();
      if (session?.user?.id) {
        setUserId(session.user.id);
        const res = await fetch(`/api/user/categories?userId=${session.user.id}`);
        const data = await res.json();
        setCategories(data.categories || []);
      }
    };
    fetchUserId();
  }, []);

  // Schnell-Setter für “diese Woche / diesen Monat”
  const applyThisWeek = () => {
    const now = new Date();
    const s = startOfWeek(now, { weekStartsOn: 1 });
    const e = endOfWeek(now, { weekStartsOn: 1 });
    setStartDate(s.toISOString().slice(0, 10));
    setEndDate(e.toISOString().slice(0, 10));
    setType("weekly");
  };

  const applyThisMonth = () => {
    const now = new Date();
    const s = startOfMonth(now);
    const e = endOfMonth(now);
    setStartDate(s.toISOString().slice(0, 10));
    setEndDate(e.toISOString().slice(0, 10));
    setType("monthly");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !startDate || !endDate || !userId) return;

    // beide Felder für Backcompat + NEU: recurring Flag
    const body = {
      userId,
      title,
      description,
      startDate,
      endDate,
      goalType: type,
      type, // Fallback fürs alte Backend
      category,
      tasks,
      recurring,
    };

    try {
      const res = await createGoal(body as any);
      const createdId = (res as any).goalId || (res as any).goal?._id;
      const apiGoal = (res as any).goal || {
        _id: createdId,
        userId,
        title,
        description,
        startDate,
        endDate,
        goalType: type,
        type,
        category,
        tasks: [],
        recurring,
      };

      const merged = mergeCreatedGoal(apiGoal, tasks as any);
      const initialProgress = computeGoalProgress({
        tasks: (merged.tasks || []) as any,
        subGoals: (merged.subGoals || []) as any,
      } as any);

      const goalForState: Goal = {
        _id: merged._id,
        userId,
        title: merged.title,
        description: merged.description,
        startDate: merged.startDate,
        endDate: merged.endDate,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        progress: typeof merged.progress === "number" ? merged.progress : initialProgress,
        goalType: merged.goalType || type,
        type: merged.type || type,
        tasks: (merged.tasks as any) || [],
        subGoals: (merged.subGoals as any) || [],
        category: merged.category,
        completedAt: (merged as any).completedAt || undefined,
        weight: (merged as any).weight,
      } as any;

      // 🔥 WICHTIG: recurring explizit in den UI-State hängen,
      // damit GoalCard das "einmalig"-Badge zeigen kann
      (goalForState as any).recurring = (merged as any).recurring ?? recurring;

      onGoalCreated(goalForState);

      // reset
      setTitle("");
      setDescription("");
      setStartDate("");
      setEndDate("");
      setType("monthly");
      setCategory("");
      setRecurring(false);
      setTasks([]);
    } catch (error) {
      console.error("Fehler beim Erstellen des Ziels", error);
    }
  };

  const handleAddTask = () => {
    setTasks((prev) => [
      ...prev,
      {
        name: "",
        description: "",
        points: 0,
        dueDate: "",
        frequency: "once",
        category: "",
        timebased: false,
        time: "",
        color: "",
        duration: "",
        status: "todo",
      },
    ]);
  };

  const handleTaskChange = (index: number, field: keyof CreateTaskBody, value: any) => {
    setTasks((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleRemoveTask = (index: number) => {
    setTasks((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <form onSubmit={handleSubmit} className="sm:max-w-[640px] sm:ml-auto sm:mr-0 h-full sm:h-auto overflow-y-auto shadow-md p-4 sm:p-6 rounded-xl w-full max-w-xl mx-auto">
      <div className="grid gap-4">
        <div>
          <label className="text-sm font-medium">Titel *</label>
          <input
            type="text"
            className="w-full border rounded p-2"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="text-sm font-medium">Beschreibung</label>
          <textarea
            className="w-full border rounded p-2"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium">Startdatum *</label>
            <input
              type="date"
              className="w-full border rounded p-2"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="text-sm font-medium">Enddatum *</label>
            <input
              type="date"
              className="w-full border rounded p-2"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              required
            />
          </div>
        </div>

        <div>
          <label className="text-sm font-medium">Typ</label>
          <select
            className="w-full border rounded p-2"
            value={type}
            onChange={(e) => setType(e.target.value as any)}
          >
            <option value="once">Einmalig</option>
            <option value="daily">Täglich</option>
            <option value="weekly">Wöchentlich</option>
            <option value="monthly">Monatlich</option>
            <option value="yearly">Jährlich</option>
            <option value="mental">Mental</option>
          </select>
        </div>

        {/* Wiederholung + Schnell-Setter */}
        <div className="grid gap-2">
          <label className="text-sm font-medium">Wiederholung</label>
          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={recurring}
              onChange={(e) => setRecurring(e.target.checked)}
            />
            <span>
              {recurring ? "Wiederkehrend (automatische Serie, später durch Backend-Logik)" : "Einmalig (nur für diesen Zeitraum)"}
            </span>
          </label>

          <div className="flex gap-2 flex-wrap">
            <button
              type="button"
              onClick={applyThisWeek}
              className="px-3 py-1 rounded border text-sm hover:bg-gray-50"
              title="Setzt Start/Ende automatisch auf diese Woche"
            >
              Diese Woche setzen
            </button>
            <button
              type="button"
              onClick={applyThisMonth}
              className="px-3 py-1 rounded border text-sm hover:bg-gray-50"
              title="Setzt Start/Ende automatisch auf diesen Monat"
            >
              Diesen Monat setzen
            </button>
          </div>
          <p className="text-xs text-gray-500">
            Tipp: Für „einmalige Wochen-/Monatsziele“ (<b>ohne</b> Wiederholung) wähle den Typ „Wöchentlich“ oder „Monatlich“, setze den Zeitraum über die Buttons und lass „Wiederholung“ <b>aus</b>.
          </p>
        </div>

        {/* Kategorie auswählen */}
        <div>
          <label className="text-sm font-medium">Kategorie (Tag auswählen)</label>
          <select
            className="w-full border rounded p-2"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="">(Keine)</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-6">
        <h3 className="text-md font-semibold mb-2">Aufgaben hinzufügen</h3>
        {tasks.map((task, idx) => (
          <div key={idx} className="border p-3 rounded mb-3">
            <div className="grid gap-2">
              <input
                type="text"
                placeholder="Name"
                value={task.name}
                onChange={(e) => handleTaskChange(idx, "name", e.target.value)}
                className="w-full border rounded p-1"
              />
              <input
                type="text"
                placeholder="Beschreibung"
                value={task.description}
                onChange={(e) => handleTaskChange(idx, "description", e.target.value)}
                className="w-full border rounded p-1"
              />
              <input
                type="number"
                placeholder="Punkte"
                value={task.points || 0}
                onChange={(e) => handleTaskChange(idx, "points", Number(e.target.value))}
                className="w-full border rounded p-1"
              />
              <select
                value={task.category || ""}
                onChange={(e) => handleTaskChange(idx, "category", e.target.value)}
                className="w-full border rounded p-1"
              >
                <option value="">(Keine)</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>

              <div className="grid grid-cols-2 gap-2">
                <select
                  value={task.frequency || "once"}
                  onChange={(e) => handleTaskChange(idx, "frequency", e.target.value as any)}
                  className="w-full border rounded p-1"
                >
                  <option value="once">Einmalig</option>
                  <option value="daily">Täglich</option>
                  <option value="weekly">Wöchentlich</option>
                  <option value="monthly">Monatlich</option>
                  <option value="yearly">Jährlich</option>
                </select>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={task.timebased || false}
                    onChange={(e) => handleTaskChange(idx, "timebased", e.target.checked)}
                  />
                  Zeitbasiert
                </label>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <input
                  type="time"
                  value={task.time || ""}
                  onChange={(e) => handleTaskChange(idx, "time", e.target.value)}
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
                  type="text"
                  placeholder="Dauer"
                  value={task.duration || ""}
                  onChange={(e) => handleTaskChange(idx, "duration", e.target.value)}
                  className="w-full border rounded p-1"
                />
              </div>

              <button
                type="button"
                onClick={() => handleRemoveTask(idx)}
                className="text-red-600 text-sm text-left"
              >
                🗑 Entfernen
              </button>
            </div>
          </div>
        ))}
        <button
          type="button"
          onClick={handleAddTask}
          className="bg-gray-700 text-white px-3 py-1 rounded text-sm"
        >
          + Aufgabe hinzufügen
        </button>
      </div>

      <div className="mt-6 text-right">
        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
        >
          Ziel erstellen
        </button>
      </div>
    </form>
  );
};

export default NewGoalForm;
