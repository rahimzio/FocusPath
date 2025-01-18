"use client";

import { useState, useEffect } from "react";
import { Task } from "@/utils/interface";
import SheetWithCreateTask from "@/components/todo/popUpCreateTask";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import Calendar from "react-calendar";
import { Value } from "react-calendar/dist/esm/shared/types.js";
import { FaCheckCircle } from "react-icons/fa"; // Optional: Icon hinzufügen
import { toast } from 'react-toastify'; // Importiere toast

// Hilfsfunktion, um ein Date-Objekt als YYYY-MM-DD zu formatieren
function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

const DailyTaskList = () => {
  // Liste der Tasks, die wir vom Server bekommen
  const [tasks, setTasks] = useState<Task[]>([]);

  // Kalender-Logik
  const [showCalendar, setShowCalendar] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>(() =>
    formatDate(new Date()) // Standard: heute
  );

  // Detail-Ansicht & Edit-Dialog
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [editedTask, setEditedTask] = useState<Task | null>(null);

  // ------------------------------------------------
  // 1) fetchTasks => holt gefilterte Tasks vom Server
  // ------------------------------------------------
  async function fetchTasks(dateParam?: string) {
    // Wenn kein Datum angegeben, nimm das heutige
    const dateToUse = dateParam || formatDate(new Date());
    console.log(`Fetching tasks for date: ${dateToUse}`);

    try {
      // Hier rufen wir z. B. /api/task/getTasks?date=2025-01-18 auf
      const response = await fetch(`/api/task/getTasks?date=${dateToUse}`);
      console.log(`Response von getTasks:`, response);
      if (!response.ok) {
        const errorText = await response.text();
        console.error("Fehler beim Abrufen der Tasks:", errorText);
        toast.error("Fehler beim Abrufen der Aufgaben.");
        return;
      }

      const data = await response.json();
      console.log("Daten von getTasks:", JSON.stringify(data, null, 2));
      const fetchedTasks: Task[] = data.tasks || [];
      setTasks(fetchedTasks);
      console.log("Aktualisierte Tasks im State:", fetchedTasks);
    } catch (error) {
      console.error("Fetch error:", error);
      toast.error("Fehler beim Abrufen der Aufgaben.");
    }
  }

  // ------------------------------------------------
  // 2) Handle Check/Uncheck => completeTask/undoCompletion
  // ------------------------------------------------
  async function handleCheckTask(taskId: string, date: string, checked: boolean) {
    console.log(
      `handleCheckTask aufgerufen mit: taskId=${taskId}, date=${date}, checked=${checked}`
    );
    try {
      if (checked) {
        // => completed
        const response = await fetch("/api/task/completeTask", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ taskId, date }),
        });
        console.log(`Response von completeTask:`, response);
        if (!response.ok) {
          const errorText = await response.text();
          console.error("Fehler bei completeTask:", errorText);
          toast.error("Fehler beim Abschließen der Aufgabe.");
          return;
        } else {
          toast.success("Aufgabe erfolgreich abgeschlossen!");
        }
      } else {
        // => incomplete
        const response = await fetch("/api/task/undoCompletion", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ taskId, date }),
        });
        console.log(`Response von undoCompletion:`, response);
        if (!response.ok) {
          const errorText = await response.text();
          console.error("Fehler bei undoCompletion:", errorText);
          toast.error("Fehler beim Rückgängigmachen der Aufgabe.");
          return;
        } else {
          toast.info("Aufgabe als offen markiert.");
        }
      }

      // Nach Update Tasks erneut laden
      await fetchTasks(date);
    } catch (error) {
      console.error("Fehler beim Aktualisieren des Status:", error);
      toast.error("Ein unerwarteter Fehler ist aufgetreten.");
    }
  }

  // ------------------------------------------------
  // 3) Aufgaben löschen
  // ------------------------------------------------
  async function handleDeleteTask(taskId: string) {
    if (!confirm("Willst du diese Aufgabe wirklich löschen?")) return;

    console.log(`handleDeleteTask aufgerufen mit: taskId=${taskId}`);

    try {
      const response = await fetch(`/api/task/deleteTask?taskId=${taskId}`, {
        method: "DELETE",
      });
      console.log(`Response von deleteTask:`, response);
      if (!response.ok) {
        const errorText = await response.text();
        console.error("Fehler beim Löschen der Task:", errorText);
        toast.error("Löschen fehlgeschlagen.");
        return;
      }
      // Nach Löschen Tasks erneut laden
      await fetchTasks(selectedDate);
      toast.success("Aufgabe erfolgreich gelöscht.");
    } catch (error) {
      console.error("Fehler beim Löschen der Task:", error);
      toast.error("Ein unerwarteter Fehler ist aufgetreten.");
    }
  }

  // ------------------------------------------------
  // 4) useEffect => beim ersten Laden + bei Änderung von selectedDate
  // ------------------------------------------------
  useEffect(() => {
    fetchTasks(selectedDate);
  }, [selectedDate]);

  // ------------------------------------------------
  // 5) Zeitbasierte vs. nicht-zeitbasierte Tasks
  // ------------------------------------------------
  const nonTimebasedTasks = tasks.filter((task) => !task.timebased);
  const timebasedTasks = tasks.filter((task) => task.timebased);

  // ------------------------------------------------
  // 6) Kalender-Logik
  // ------------------------------------------------
  function handleDateChange(dateValue: Value) {
    if (dateValue instanceof Date) {
      const formattedDate = formatDate(dateValue);
      console.log(`Datum geändert auf: ${formattedDate}`);
      setSelectedDate(formattedDate);
    }
  }

  // ------------------------------------------------
  // 7) Task-Editieren
  // ------------------------------------------------
  async function handleEditTask(event: React.FormEvent) {
    event.preventDefault();
    if (!editedTask || !editedTask._id) {
      console.error("Keine Task ausgewählt");
      toast.error("Keine Aufgabe ausgewählt zum Bearbeiten.");
      return;
    }
    console.log(`handleEditTask aufgerufen mit:`, editedTask);
    try {
      const response = await fetch(
        `/api/task/updateTask?taskId=${editedTask._id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: editedTask.name,
            description: editedTask.description,
            points: editedTask.points,
            dueDate: editedTask.dueDate,
            time: editedTask.time,
            frequency: editedTask.frequency,
            category: editedTask.category,
          }),
        }
      );
      console.log(`Response von updateTask:`, response);
      if (!response.ok) {
        const errorMessage = await response.text();
        console.error("Fehler beim Bearbeiten:", errorMessage);
        toast.error("Fehler beim Bearbeiten der Aufgabe.");
        return;
      }
      // Edit-Dialog schließen
      setEditedTask(null);
      setSelectedTask(null);

      // Neu laden
      await fetchTasks(selectedDate);
      toast.success("Aufgabe erfolgreich bearbeitet!");
    } catch (error) {
      console.error("Fehler beim Bearbeiten:", error);
      toast.error("Ein unerwarteter Fehler ist aufgetreten.");
    }
  }

  // ------------------------------------------------
  // 8) Detail-Ansicht öffnen
  // ------------------------------------------------
  function openTaskDetails(task: Task) {
    console.log(`openTaskDetails aufgerufen mit:`, task);
    setSelectedTask(task);
  }

  // ------------------------------------------------
  // 9) Edit-Dialog öffnen
  // ------------------------------------------------
  function openEditDialog(task: Task) {
    console.log(`openEditDialog aufgerufen mit:`, task);
    setEditedTask(task);
  }

  // ------------------------------------------------
  // RENDER
  // ------------------------------------------------
  return (
    <div className="space-y-6">
      {/* Datum + Kalender */}
      <div className="flex flex-row items-center gap-4">
        <div
          className="cursor-pointer font-semibold text-lg"
          onClick={() => {
            console.log("Kalender anzeigen/verstecken");
            setShowCalendar(!showCalendar);
          }}
        >
          {selectedDate
            ? `Gewähltes Datum: ${new Date(selectedDate).toLocaleDateString(
                "de-DE"
              )}`
            : `Heutiges Datum: ${new Date().toLocaleDateString("de-DE")}`}
        </div>
        {showCalendar && (
          <Calendar
            onChange={handleDateChange}
            value={new Date(selectedDate)}
          />
        )}
      </div>

      {/* Aufgaben ohne Uhrzeit */}
      <div className="bg-gray-100 p-4 rounded-lg shadow-md mb-10 text-black">
        <h2 className="text-xl font-semibold mb-4 text-gray-700">
          Aufgaben ohne Uhrzeit
        </h2>
        {nonTimebasedTasks.length === 0 ? (
          <p className="text-gray-600">Keine Aufgaben ohne Uhrzeit vorhanden.</p>
        ) : (
          <div className="space-y-4 overflow-y-auto max-h-[300px]">
            {nonTimebasedTasks.map((task) => (
              <div
                key={task._id}
                className={`p-3 border rounded flex items-center ${
                  task.status === "completed" ? "completed" : ""
                }`}
              >
                <div className="flex-grow">
                  <h4 className="font-semibold">{task.name}</h4>
                  <p>{task.description}</p>
                </div>
                {task.status === "completed" && (
                  <FaCheckCircle className="text-green-500 ml-2" />
                )}
                {/* Checkbox */}
                <div className="mt-2 flex items-center">
                  <input
                    id={`taskCheck-${task._id}`}
                    type="checkbox"
                    checked={task.status === "completed"}
                    onChange={(e) =>
                      handleCheckTask(task._id!, selectedDate, e.target.checked)
                    }
                  />
                  <label
                    htmlFor={`taskCheck-${task._id}`}
                    className="ml-2 select-none"
                  >
                    {task.status === "completed" ? "Abgeschlossen" : "Offen"}
                  </label>
                </div>

                <div className="mt-2 flex gap-2">
                  <button
                    onClick={() => openTaskDetails(task)}
                    className="bg-blue-500 text-white px-2 py-1 rounded"
                  >
                    Details
                  </button>
                  <button
                    onClick={() => openEditDialog(task)}
                    className="bg-green-500 text-white px-2 py-1 rounded"
                  >
                    Editieren
                  </button>
                  <button
                    onClick={() => handleDeleteTask(task._id!)}
                    className="bg-red-500 text-white px-2 py-1 rounded"
                  >
                    Löschen
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Aufgaben mit Uhrzeit */}
      <div className="bg-white p-4 rounded-lg shadow-md mb-10 text-black">
        <h2 className="text-xl font-semibold mb-4 text-gray-700">
          Aufgaben mit Uhrzeit
        </h2>
        {timebasedTasks.length === 0 ? (
          <p className="text-gray-600">
            Keine zeitbasierten Aufgaben vorhanden.
          </p>
        ) : (
          <div className="space-y-4 overflow-y-auto max-h-[300px]">
            {timebasedTasks.map((task) => (
              <div
                key={task._id}
                className={`p-3 border rounded flex items-center ${
                  task.status === "completed" ? "completed" : ""
                }`}
              >
                <div className="flex-grow">
                  <h4 className="font-semibold">{task.name}</h4>
                  <p>{task.description}</p>
                  {task.time && (
                    <p className="text-sm">
                      <span className="font-medium">Uhrzeit:</span> {task.time}
                    </p>
                  )}
                </div>
                {task.status === "completed" && (
                  <FaCheckCircle className="text-green-500 ml-2" />
                )}
                {/* Checkbox */}
                <div className="mt-2 flex items-center">
                  <input
                    id={`timeTaskCheck-${task._id}`}
                    type="checkbox"
                    checked={task.status === "completed"}
                    onChange={(e) =>
                      handleCheckTask(task._id!, selectedDate, e.target.checked)
                    }
                  />
                  <label
                    htmlFor={`timeTaskCheck-${task._id}`}
                    className="ml-2 select-none"
                  >
                    {task.status === "completed" ? "Abgeschlossen" : "Offen"}
                  </label>
                </div>

                <div className="mt-2 flex gap-2">
                  <button
                    onClick={() => openTaskDetails(task)}
                    className="bg-blue-500 text-white px-2 py-1 rounded"
                  >
                    Details
                  </button>
                  <button
                    onClick={() => openEditDialog(task)}
                    className="bg-green-500 text-white px-2 py-1 rounded"
                  >
                    Editieren
                  </button>
                  <button
                    onClick={() => handleDeleteTask(task._id!)}
                    className="bg-red-500 text-white px-2 py-1 rounded"
                  >
                    Löschen
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Detail-Popup */}
      {selectedTask && (
        <Dialog
          open={Boolean(selectedTask)}
          onOpenChange={(open) => setSelectedTask(open ? selectedTask : null)}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{selectedTask.name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-2 mt-4">
              <p>{selectedTask.description}</p>
              <p>
                <span className="font-semibold">Punkte:</span>{" "}
                {selectedTask.points}
              </p>
              <p>
                <span className="font-semibold">Status:</span>{" "}
                {selectedTask.status}
              </p>
              <p>
                <span className="font-semibold">Fällig am:</span>{" "}
                {selectedTask.dueDate}
              </p>
              {selectedTask.time && (
                <p>
                  <span className="font-semibold">Uhrzeit:</span>{" "}
                  {selectedTask.time}
                </p>
              )}
              <p>
                <span className="font-semibold">Kategorie:</span>{" "}
                {selectedTask.category}
              </p>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Edit-Popup */}
      {editedTask && (
        <Dialog
          open={Boolean(editedTask)}
          onOpenChange={(open) => setEditedTask(open ? editedTask : null)}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Aufgabe bearbeiten</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleEditTask} className="mt-4 space-y-4">
              {/* Name */}
              <input
                type="text"
                value={editedTask.name}
                onChange={(e) =>
                  setEditedTask({ ...editedTask, name: e.target.value })
                }
                className="p-2 border border-gray-300 rounded-md w-full"
                placeholder="Aufgabenname"
                required
              />

              {/* Beschreibung */}
              <textarea
                value={editedTask.description}
                onChange={(e) =>
                  setEditedTask({ ...editedTask, description: e.target.value })
                }
                className="p-2 border border-gray-300 rounded-md w-full"
                placeholder="Beschreibung"
                required
              />

              {/* Punkte */}
              <input
                type="number"
                value={editedTask.points}
                onChange={(e) =>
                  setEditedTask({
                    ...editedTask,
                    points: parseInt(e.target.value, 10) || 0,
                  })
                }
                className="p-2 border border-gray-300 rounded-md w-full"
                placeholder="Punkte"
                min={0}
                required
              />

              {/* Datum */}
              <input
                type="date"
                value={editedTask.dueDate}
                onChange={(e) =>
                  setEditedTask({ ...editedTask, dueDate: e.target.value })
                }
                className="p-2 border border-gray-300 rounded-md w-full"
                required
              />

              {/* Uhrzeit */}
              <input
                type="time"
                value={editedTask.time ?? ""}
                onChange={(e) =>
                  setEditedTask({ ...editedTask, time: e.target.value })
                }
                className="p-2 border border-gray-300 rounded-md w-full"
              />

              {/* Frequenz */}
              <select
                value={editedTask.frequency}
                onChange={(e) =>
                  setEditedTask({
                    ...editedTask,
                    frequency: e.target.value as Task["frequency"],
                  })
                }
                className="p-2 border border-gray-300 rounded-md w-full"
                required
              >
                <option value="once">Einmalig</option>
                <option value="daily">Täglich</option>
                <option value="weekly">Wöchentlich</option>
                <option value="monthly">Monatlich</option>
                <option value="yearly">Jährlich</option>
              </select>

              {/* Kategorie */}
              <input
                type="text"
                value={editedTask.category}
                onChange={(e) =>
                  setEditedTask({ ...editedTask, category: e.target.value })
                }
                className="p-2 border border-gray-300 rounded-md w-full"
                placeholder="Kategorie"
                required
              />

              <button
                type="submit"
                className="bg-green-500 text-white px-4 py-2 rounded-md"
              >
                Speichern
              </button>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* Button zum Erstellen einer neuen Aufgabe */}
      <SheetWithCreateTask />
    </div>
  );
};

export default DailyTaskList;
