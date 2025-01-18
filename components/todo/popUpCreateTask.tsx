"use client";

import { useState, useEffect } from "react";
import { Task, Goal } from "@/utils/interface";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

// Beispiel: Vordefinierte Goals
const predefinedGoals: Goal[] = [
  {
    id: "sport",
    title: "Sport",
    description: "Fitnessziele und sportliche Aktivitäten",
    dueDate: "",
    progress: 0,
    tasks: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "finanzen",
    title: "Finanzen",
    description: "Verwaltung und Organisation der Finanzen",
    dueDate: "",
    progress: 0,
    tasks: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  // ... usw ...
];

export default function SheetWithCreateTask() {
  // Task für das Formular
  const [task, setTask] = useState<Omit<Task, "_id">>({
    // kein _id (Mongo generiert es)
    id: "",
    name: "",
    description: "",
    points: 0,
    status: "incomplete",
    dueDate: "",
    frequency: "daily",
    category: "",
    linkedApps: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    timebased: false,
    time: "",
    // duration?: string
  });

  // Liste aller Tasks (lokal, nur zur Demo)
  const [tasks, setTasks] = useState<Task[]>([]);

  // Alle Goals (prädefiniert + aus DB)
  const [goals, setGoals] = useState<Goal[]>([]);
  const [selectedGoalId, setSelectedGoalId] = useState<string>("");

  // 1) Goals laden
  useEffect(() => {
    fetch("/api/goals/getGoals") // => { goals: [...] }
      .then((res) => res.json())
      .then((data: { goals: Goal[] }) => {
        // Kombiniere vordefinierte + geladene
        const combinedGoals = [...predefinedGoals, ...data.goals];
        setGoals(combinedGoals);
      })
      .catch((error) => console.error("Fehler beim Laden der Ziele", error));
  }, []);

  // 2) Handle Submit = Task erstellen
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    // Sende POST-Request
    const response = await fetch("/api/task/createTask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...task,
        goalId: selectedGoalId || undefined,
      }),
    });

    if (response.ok) {
      alert("Aufgabe erfolgreich erstellt!");
      const jsonData = await response.json();
      // jsonData => { message: "...", taskId: "..." }

      // Baue ein Task-Objekt, damit wir es in tasks integrieren können
      const insertedTask: Task = {
        _id: jsonData.taskId, // vom Server bekommen
        ...task,             // restliche Felder
      };

      // tasks-State updaten
      setTasks((prev) => [...prev, insertedTask]);

      // Task-Formular zurücksetzen
      setTask({
        id: "",
        name: "",
        description: "",
        points: 0,
        status: "incomplete",
        dueDate: "",
        frequency: "daily",
        category: "",
        linkedApps: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        timebased: false,
        time: "",
      });
      setSelectedGoalId("");
    } else {
      alert("Fehler beim Erstellen der Aufgabe");
    }
  };

  // 3) Eingabewerte aktualisieren
  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    setTask((prev) => ({
      ...prev,
      [name]: name === "points" ? parseInt(value, 10) || 0 : value,
    }));
  };

  return (
    <div className="fixed bottom-4 right-4 z-100">
      <Sheet>
        <SheetTrigger className="bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg hover:bg-blue-700">
          Neue Aufgabe erstellen
        </SheetTrigger>
        <SheetContent className="w-[400px] sm:w-[540px] max-h-[100vh] overflow-y-auto text-black">
          <SheetHeader>
            <SheetTitle>Neue Aufgabe erstellen</SheetTitle>
            <SheetDescription>
              Füllen Sie die Details aus, um eine neue Aufgabe zu erstellen.
            </SheetDescription>
          </SheetHeader>

          <form onSubmit={handleSubmit} className="mt-4">
            {/* Name */}
            <div className="mb-4">
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
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

            {/* Beschreibung */}
            <div className="mb-4">
              <label htmlFor="description" className="block text-sm font-medium text-gray-700">
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

            {/* Punkte */}
            <div className="mb-4">
              <label htmlFor="points" className="block text-sm font-medium text-gray-700">
                Punkte
              </label>
              <input
                type="number"
                id="points"
                name="points"
                value={task.points}
                onChange={handleChange}
                required
                className="mt-1 block w-full rounded-md border-gray-300"
              />
            </div>

            {/* Fälligkeitsdatum */}
            <div className="mb-4">
              <label htmlFor="dueDate" className="block text-sm font-medium text-gray-700">
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

            {/* Häufigkeit */}
            <div className="mb-4">
              <label htmlFor="frequency" className="block text-sm font-medium text-gray-700">
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

            {/* Zielauswahl */}
            <div className="mb-4">
              <label htmlFor="goalId" className="block text-sm font-medium text-gray-700">
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
                  <option key={goal.id} value={goal.id}>
                    {goal.title}
                  </option>
                ))}
              </select>
            </div>

            {/* Kategorie */}
            <div className="mb-4">
              <label htmlFor="category" className="block text-sm font-medium text-gray-700">
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

            {/* Verlinkte Apps */}
            <div className="mb-4">
              <label htmlFor="linkedApps" className="block text-sm font-medium text-gray-700">
                Verlinkte Apps (Komma-getrennt)
              </label>
              <input
                type="text"
                id="linkedApps"
                name="linkedApps"
                value={task.linkedApps.join(", ")}
                onChange={(e) => {
                  const apps = e.target.value.split(",").map((app) => app.trim());
                  setTask((prev) => ({ ...prev, linkedApps: apps }));
                }}
                className="mt-1 block w-full rounded-md border-gray-300"
              />
            </div>

            {/* Uhrzeit */}
            <div className="mb-4">
              <label htmlFor="time" className="block text-sm font-medium text-gray-700">
                Uhrzeit (optional)
              </label>
              <input
                type="time"
                id="time"
                name="time"
                value={task.time}
                onChange={handleChange}
                disabled={!task.timebased}
                className="mt-1 block w-full rounded-md border-gray-300"
              />
            </div>

            {/* Checkbox Zeitbasiert */}
            <div className="mb-4 flex items-center gap-2">
              <label htmlFor="timebased" className="block text-sm font-medium text-gray-700">
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
