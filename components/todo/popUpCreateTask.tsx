"use client";

import { useState, useEffect } from "react";
import { Task, Goal, SubTask } from "@/utils/interface";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { v4 as uuidv4 } from "uuid"; // Für die Erzeugung eindeutiger IDs
type Props = {
  onTaskCreated?: (newTask: Task) => Promise<void>;
  userId:string;
};
// Beispiel: Vordefinierte Goals
const predefinedGoals: Goal[] = [
  // ... weitere Ziele
];

export default function SheetWithCreateTask({ userId, onTaskCreated }: Props) {
  // Hauptaufgaben-Objekt (ohne _id und subTasks)
  const [task, setTask] = useState<Omit<Task, "_id" | "subTasks">>({
    userId:userId,
    id: "",
    name: "",
    description: "",
    points: 1,
    status: "incomplete",
    dueDate: "",
    frequency: "daily",
    category: "",
    linkedApps: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    timebased: false,
    time: "",
    progress: 0,
    duration: "",
    daysOfWeek: [],
    interval: 1,
  });
 
  // Subtasks-Array
  const [subTasks, setSubTasks] = useState<SubTask[]>([]);

  // Liste aller Tasks (nur Demo)
  const [tasks, setTasks] = useState<Task[]>([]);

  // Alle Goals (vordefiniert + aus der DB)
  const [goals, setGoals] = useState<Goal[]>([]);
  const [selectedGoalId, setSelectedGoalId] = useState<string>("");

  // Goals laden
  useEffect(() => {
    fetch("/api/goals/getGoals")
      .then((res) => res.json())
      .then((data: { goals?: Goal[] }) => {
        if (data.goals && Array.isArray(data.goals) && data.goals.length > 0) {
          const combinedGoals = [...predefinedGoals, ...data.goals];
          setGoals(combinedGoals);
        } else {
          console.log("Keine Ziele gefunden. Verwende nur vordefinierte Ziele.");
          setGoals(predefinedGoals);
        }
      })
      .catch((error) => {
        console.error("Fehler beim Laden der Ziele", error);
        // Bei Fehlern wird stattdessen auf die vordefinierten Ziele zurückgegriffen
        setGoals(predefinedGoals);
      });
  }, []);

  // Beim Absenden der Formulardaten wird die Aufgabe inkl. Subtasks erstellt
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const payload = {
      ...task,
      goalId: selectedGoalId || undefined,
      subTasks,
    };
 console.log("📤 create task payload", payload);
    const response = await fetch("/api/task/createTask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      const jsonData = await response.json();
      const insertedTask: Task = {
        _id: jsonData.taskId,
        ...task,
        subTasks,
      };

      // ✅ Callback aufrufen, wenn vorhanden
      if (onTaskCreated) {
        await onTaskCreated(insertedTask);
      }

      alert("Aufgabe erfolgreich erstellt!");
      setTasks((prev) => [...prev, insertedTask]);

      // Formular zurücksetzen
      setTask({
        userId:userId,
        id: "",
        name: "",
        description: "",
        points: 1,
        status: "incomplete",
        dueDate: "",
        frequency: "daily",
        category: "",
        linkedApps: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        timebased: false,
        time: "",
        progress: 0,
        duration: "",
        daysOfWeek: [],
        interval: 1,
      });
      setSubTasks([]);
      setSelectedGoalId("");
    } else {
      alert("Fehler beim Erstellen der Aufgabe");
    }
  };


  // Aktualisierung der Hauptaufgabenfelder
  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    setTask((prev) => ({
      ...prev,
      [name]: name === "points" || name === "interval" ? parseInt(value, 10) || 0 : value,
    }));
  };

   const toggleDayOfWeek = (day: number) => {
    setTask((prev) => {
      const current = prev.daysOfWeek || [];
      const updated = current.includes(day)
        ? current.filter((d) => d !== day)
        : [...current, day];
      return { ...prev, daysOfWeek: updated };
    });
  };
  // Funktion zum Hinzufügen eines leeren Subtasks mit eindeutiger ID
  const addSubTask = () => {
    setSubTasks((prev) => [
      ...prev,
      { _id: uuidv4(), name: "", description: "", status: "incomplete" },
    ]);
  };

  // Aktualisierung der Subtask-Felder
  const handleSubTaskChange = (
    index: number,
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setSubTasks((prev) =>
      prev.map((subtask, i) => {
        if (i === index) {
          return { ...subtask, [name]: name === "points" ? parseInt(value, 10) || 0 : value };
        }
        return subtask;
      })
    );
  };

  // Entfernen eines Subtasks
  const removeSubTask = (index: number) => {
    setSubTasks((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="fixed bottom-4 right-4 z-100">
      <Sheet>
        <SheetTrigger className="bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg hover:bg-blue-700">
          Neue Aufgabe erstellen
        </SheetTrigger>
        <SheetContent className="w-[400px] sm:w-[540px] max-h-[100vh] overflow-y-auto text-black">
          <SheetHeader>
            <SheetTitle className="text-white">Neue Aufgabe erstellen</SheetTitle>
            <SheetDescription>
              Füllen Sie die Details aus, um eine neue Aufgabe zu erstellen.
            </SheetDescription>
          </SheetHeader>

          <form onSubmit={handleSubmit} className="mt-4">
            {/* Hauptaufgabenfelder */}
            <div className="mb-4">
              <label htmlFor="name" className="block text-sm font-medium text-white">
                Name
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={task.name}
                onChange={handleChange}
                required
                className="mt-1 block w-full rounded-md border-gray-300"
              />
            </div>

            <div className="mb-4">
              <label htmlFor="description" className="block text-sm font-medium text-white">
                Beschreibung
              </label>
              <textarea
                id="description"
                name="description"
                value={task.description}
                onChange={handleChange}
                required
                className="mt-1 block w-full rounded-md border-gray-300"
              />
            </div>

            <div className="mb-4">
              <label htmlFor="points" className="block text-sm font-medium text-white">
                Punkte
              </label>
              <input
                type="number"
                id="points"
                name="points"
                value={task.points}
                onChange={handleChange}
                min={1}
                max={10}
                required
                className="mt-1 block w-full rounded-md border-gray-300"
              />
            </div>

            <div className="mb-4">
              <label htmlFor="color" className="block text-sm font-medium text-white">
                Farbe der Aufgabe
              </label>
              <input
                type="color"
                id="color"
                name="color"
                value={task.color ?? "#3B82F6"} // Standardfarbe (z. B. blau)
                onChange={(e) => setTask((prev) => ({ ...prev, color: e.target.value }))}
                className="mt-1 block w-full h-10 cursor-pointer"
              />
            </div>


            <div className="mb-4">
              <label htmlFor="dueDate" className="block text-sm font-medium text-white">
                Fälligkeitsdatum
              </label>
              <input
                type="date"
                id="dueDate"
                name="dueDate"
                value={task.dueDate}
                onChange={handleChange}
                required
                className="mt-1 block w-full rounded-md border-gray-300"
              />
            </div>

            <div className="mb-4">
              <label htmlFor="frequency" className="block text-sm font-medium text-white">
                Häufigkeit
              </label>
              <select
                id="frequency"
                name="frequency"
                value={task.frequency}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border-gray-300"
              >
                <option value="once">Einmalig</option>
                <option value="daily">Täglich</option>
                <option value="weekly">Wöchentlich</option>
                <option value="monthly">Monatlich</option>
                <option value="yearly">Jährlich</option>
              </select>
            </div>

{task.frequency === "weekly" && (
              <div className="mb-4">
                <span className="block text-sm font-medium text-white">Wochentage</span>
                <div className="flex flex-wrap gap-2 mt-1">
                  {['So','Mo','Di','Mi','Do','Fr','Sa'].map((label, idx) => (
                    <label key={idx} className="flex items-center text-sm gap-1">
                      <input
                        type="checkbox"
                        checked={task.daysOfWeek?.includes(idx) || false}
                        onChange={() => toggleDayOfWeek(idx)}
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </div>
            )}

            {task.frequency === "daily" && (
              <div className="mb-4">
                <label htmlFor="interval" className="block text-sm font-medium text-white">
                  Alle X Tage
                </label>
                <input
                  type="number"
                  id="interval"
                  name="interval"
                  min={1}
                  value={task.interval}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300"
                />
              </div>
            )}

            <div className="mb-4">
              <label htmlFor="goalId" className="block text-sm font-medium text-white">
                Ziel
              </label>
              <select
                id="goalId"
                name="goalId"
                value={selectedGoalId}
                onChange={(e) => setSelectedGoalId(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300"
              >
                <option value="">(Kein Ziel)</option>
                {goals.map((goal) => (
                  <option key={goal._id} value={goal._id}>
                    {goal.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="mb-4">
              <label htmlFor="category" className="block text-sm font-medium text-white">
                Kategorie
              </label>
              <input
                type="text"
                id="category"
                name="category"
                value={task.category}
                onChange={handleChange}
                required
                className="mt-1 block w-full rounded-md border-gray-300"
              />
            </div>

            <div className="mb-4 flex items-center gap-2">
              <label htmlFor="timebased" className="block text-sm font-medium text-white">
                Zeitbasiert
              </label>
              <input
                type="checkbox"
                id="timebased"
                name="timebased"
                checked={task.timebased}
                onChange={() =>
                  setTask((prev) => ({ ...prev, timebased: !prev.timebased }))
                }
              />
            </div>
            
            {task.timebased && (
              <>
                <label className="block font-medium text-sm text-white">Uhrzeit</label>
                <input
                  type="time"
                  value={task.time}
                  onChange={(e) => setTask({ ...task, time: e.target.value })}
                  className="p-2 border border-gray-300 rounded-md w-full mb-4"
                />

                <label className="block font-medium text-sm text-white">Dauer (HH:MM)</label>
                <input
                  type="time"
                  step="60"
                  value={task.duration || "00:30"} // default: 30 Minuten
                  onChange={(e) => setTask({ ...task, duration: e.target.value })}
                  className="p-2 border border-gray-300 rounded-md w-full mb-4"
                />
              </>
            )}


            {/* Subtasks-Bereich */}
            <div className="mb-4 border-t pt-4">
              <h3 className="text-lg font-semibold mb-2 text-white">Subtasks (optional)</h3>
              {subTasks.map((subtask, index) => (
                <div key={subtask._id || index} className="mb-4 p-2 border rounded">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-medium text-white">Subtask {index + 1}</span>
                    <button
                      type="button"
                      onClick={() => removeSubTask(index)}
                      className="text-red-600 text-sm"
                    >
                      Entfernen
                    </button>
                  </div>
                  <div className="mb-2">
                    <label
                      htmlFor={`subtask-name-${index}`}
                      className="block text-sm font-medium text-white"
                    >
                      Name
                    </label>
                    <input
                      type="text"
                      id={`subtask-name-${index}`}
                      name="name"
                      value={subtask.name}
                      onChange={(e) => handleSubTaskChange(index, e)}
                      required
                      className="mt-1 block w-full rounded-md border-gray-300"
                    />
                  </div>
                  <div className="mb-2">
                    <label
                      htmlFor={`subtask-description-${index}`}
                      className="block text-sm font-medium text-white"
                    >
                      Beschreibung
                    </label>
                    <textarea
                      id={`subtask-description-${index}`}
                      name="description"
                      value={subtask.description || ""}
                      onChange={(e) => handleSubTaskChange(index, e)}
                      className="mt-1 block w-full rounded-md border-gray-300"
                    />
                  </div>
                </div>
              ))}
              <button
                type="button"
                onClick={addSubTask}
                className="bg-green-600 text-white px-3 py-1 rounded-md hover:bg-green-700"
              >
                Subtask hinzufügen
              </button>
            </div>

            <button
              type="submit"
              className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md shadow hover:bg-indigo-700"
            >
              Aufgabe erstellen
            </button>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  );
}
