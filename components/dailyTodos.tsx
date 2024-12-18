"use client";

import { useState, useEffect } from "react";
import { Task } from "@/utils/interface";
import SheetWithCreateTask from "./todo/popUpCreateTask"; // Wichtig: Beibehalten
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import Calendar from "react-calendar";
import { Value } from "react-calendar/dist/esm/shared/types.js";

interface UserData {
  userId: string;
  structuredKlonData: {
    dailyTasks: Task[];
    weeklyGoals: Task[];
    monthlyGoals: Task[];
    yearlyGoals: Task[];
  };
}

const DailyTaskList = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [editedTask, setEditedTask] = useState<Task | null>(null);
  const [showCalendar, setShowCalendar] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>("");

  // Hilfsfunktion zum Formatieren des Datums im Format YYYY-MM-DD
  const formatDate = (date: Date) => {
    const year = date.getFullYear();
    const month = ("0" + (date.getMonth() + 1)).slice(-2);
    const day = ("0" + date.getDate()).slice(-2);
    return `${year}-${month}-${day}`;
  };

  const today = formatDate(new Date());

  /**
   * Ruft Aufgaben für ein bestimmtes Datum ab. Falls kein Datum übergeben wird,
   * wird das currently selectedDate oder heute verwendet.
   */
  const fetchTasks = async (dateParam?: string) => {
    const dateToUse = dateParam || selectedDate || today;
    console.log("fetchTasks aufgerufen mit date:", dateToUse);

    try {
      const response = await fetch(`/api/task/getTask?date=${dateToUse}`);
      if (!response.ok) {
        const errorText = await response.text();
        console.error("Fehler beim Abrufen der Daten:", errorText);
        throw new Error("Fehler beim Abrufen der Daten: " + errorText);
      }

      const data: UserData = await response.json();
      const dailyTasks = data.structuredKlonData.dailyTasks || [];
      console.log("Tasks vom Server für", dateToUse, ":", dailyTasks);

      // Wir setzen alle Tasks. Da der Server bereits nach Datum filtert,
      // sollten wir im Idealfall nur noch nach timebased unterscheiden müssen.
      setTasks(dailyTasks);
    } catch (error) {
      console.error("Fehler beim Abrufen der Daten (Catch-Block):", error);
      setTasks([]);
      throw error; // Werfen, um zu signalisieren, dass etwas schiefging
    }
  };

  useEffect(() => {
    // Initial einmalige Ladung der Aufgaben für heute
    fetchTasks().catch((err) => {
      console.error("Fehler beim Initial-Fetch:", err);
    });
  }, []);

  const handleTaskCheck = async (taskId: string, checked: boolean) => {
    console.log(
      "handleTaskCheck aufgerufen für Task:",
      taskId,
      "checked:",
      checked
    );
    try {
      const response = await fetch(`/api/task/updateTask?taskId=${taskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: checked ? "completed" : "incomplete" }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(
          "Fehler beim Aktualisieren des Aufgabenstatus:",
          errorText
        );
        throw new Error(
          "Fehler beim Aktualisieren des Aufgabenstatus:" + errorText
        );
      }

      console.log("Status erfolgreich aktualisiert, Tasks neu laden...");
      await fetchTasks(); // Aufgabenliste aktualisieren
    } catch (error) {
      console.error("Fehler beim Senden der Anfrage:", error);
    }
  };

  const openTaskDetails = (task: Task) => {
    console.log("openTaskDetails für Task:", task._id, task.name);
    setSelectedTask(task);
  };

  const openEditDialog = (task: Task) => {
    console.log("openEditDialog für Task:", task._id, task.name);
    setEditedTask(task);
  };

  const handleEditTask = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!editedTask) {
      console.error("Keine Aufgabe zum Bearbeiten ausgewählt");
      return;
    }

    console.log("handleEditTask für Task:", editedTask._id, editedTask.name);

    try {
      const response = await fetch(
        `/api/task/updateTask?taskId=${editedTask._id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(editedTask),
        }
      );

      if (!response.ok) {
        const errorMessage = await response.text();
        console.error("Fehler beim Bearbeiten der Aufgabe:", errorMessage);
        alert("Fehler beim Bearbeiten der Aufgabe. " + errorMessage);
        return;
      }

      console.log("Aufgabe erfolgreich aktualisiert, Tasks neu laden...");
      setEditedTask(null);
      setSelectedTask(null);
      await fetchTasks();
    } catch (error) {
      console.error("Fehler beim Senden der Anfrage:", error);
      alert("Fehler beim Bearbeiten der Aufgabe.");
    }
  };

  const handleDateChange = (date: Value) => {
    if (date && date instanceof Date) {
      const formattedDate = formatDate(date);
      console.log("handleDateChange aufgerufen, neues Datum:", formattedDate);
      setSelectedDate(formattedDate);
      setShowCalendar(false);
      // Nach Datumsauswahl erneut Aufgaben abrufen
      fetchTasks(formattedDate).catch((err) => {
        console.error("Fehler beim Fetch nach Datumsauswahl:", err);
      });
    }
  };

  const displayDate = selectedDate || today;

  console.log(
    "Rendering DailyTaskList mit displayDate:",
    displayDate,
    "und tasks:",
    tasks
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-row">
        <div
          className="cursor-pointer font-semibold text-lg"
          onClick={() => {
            console.log("Kalender Anzeige getoggled");
            setShowCalendar(!showCalendar);
          }}
        >
          {selectedDate
            ? `Angestrebtes Datum: ${new Date(selectedDate).toLocaleDateString(
                "de-DE"
              )}`
            : `Heutiges Datum: ${new Date().toLocaleDateString("de-DE")}`}
        </div>
        {showCalendar && (
          <Calendar
            onChange={handleDateChange}
            value={selectedDate ? new Date(selectedDate) : new Date()}
          />
        )}
      </div>

      {/* Container für Aufgaben ohne Uhrzeit */}
      <div className="sticky top-0 bg-gray-100 p-4 rounded-lg shadow-md z-10 mb-10">
        <h2 className="text-xl font-semibold mb-4 text-gray-700">
          Aufgaben ohne Uhrzeit
        </h2>
        <div className="space-y-4 overflow-y-auto max-h-[300px]">
          {tasks.length > 0 ? (
            tasks
              .filter((task) => {
                const taskDueDate = formatDate(new Date(task.dueDate));
                const passt = !task.timebased && taskDueDate === displayDate;
                if (!passt) {
                  console.log(
                    "Aufgabe ohne Uhrzeit wird gefiltert (nicht angezeigt):",
                    task._id,
                    task.name,
                    "dueDate:",
                    taskDueDate,
                    "displayDate:",
                    displayDate
                  );
                }
                return passt;
              })
              .map((task) => (
                <div
                  key={task._id}
                  onClick={() => openTaskDetails(task)}
                  className="cursor-pointer p-3 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  <h3 className="font-semibold text-sm text-gray-800">
                    {task.name}
                  </h3>
                  <p className="text-xs text-gray-500">{task.description}</p>
                  <p className="text-xs text-gray-400">
                    Fällig am: {task.dueDate}
                  </p>
                </div>
              ))
          ) : (
            <p className="text-sm text-gray-500">
              Keine Aufgaben ohne Uhrzeit gefunden.
            </p>
          )}
        </div>
      </div>

      {/* Container für Aufgaben mit Uhrzeit */}
      <div className="bg-white p-4 rounded-lg shadow-md z-10 mb-10">
        <h2 className="text-xl font-semibold mb-4 text-gray-700">
          Aufgaben für {new Date(displayDate).toLocaleDateString("de-DE")}
        </h2>
        <div className="space-y-4 overflow-y-auto max-h-[300px]">
          {tasks.length > 0 ? (
            tasks
              .filter((task) => {
                const taskDueDate = formatDate(new Date(task.dueDate));
                const passt = task.timebased && taskDueDate === displayDate;
                if (!passt && task.timebased) {
                  console.log(
                    "Zeitbasierte Aufgabe wird gefiltert (nicht angezeigt):",
                    task._id,
                    task.name,
                    "dueDate:",
                    taskDueDate,
                    "displayDate:",
                    displayDate
                  );
                }
                return passt;
              })
              .sort((a, b) => (a.time || "").localeCompare(b.time || ""))
              .map((task) => (
                <div
                  key={task._id}
                  onClick={() => openTaskDetails(task)}
                  className="cursor-pointer p-3 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  <h3 className="font-semibold text-sm text-gray-800">
                    {task.name}
                  </h3>
                  <p className="text-xs text-gray-500">{task.description}</p>
                  <p className="text-xs text-gray-400">
                    Fällig am: {task.dueDate} um {task.time}
                  </p>
                </div>
              ))
          ) : (
            <p className="text-sm text-gray-500">
              Keine Aufgaben für diesen Tag gefunden.
            </p>
          )}
        </div>
      </div>

      {/* Pop-up für die detaillierte Ansicht der Aufgabe */}
      {selectedTask && (
        <Dialog
          open={Boolean(selectedTask)}
          onOpenChange={(open) => {
            if (!open)
              console.log("Popup geschlossen für Task:", selectedTask._id);
            setSelectedTask(open ? selectedTask : null);
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{selectedTask.name}</DialogTitle>
            </DialogHeader>
            <p>{selectedTask.description}</p>
            <p>Punkte: {selectedTask.points}</p>
            <p>Status: {selectedTask.status}</p>
            <p>Fällig am: {selectedTask.dueDate}</p>
            <p>Uhrzeit: {selectedTask.time}</p>
            <p>Kategorie: {selectedTask.category}</p>

            {/* Editieren-Button */}
            <button
              onClick={() => openEditDialog(selectedTask)}
              className="mt-4 bg-yellow-500 text-white px-4 py-2 rounded-md"
            >
              Editieren
            </button>

            <button
              onClick={() =>
                handleTaskCheck(
                  selectedTask._id,
                  selectedTask.status !== "completed"
                )
              }
              className={`mt-4 ${
                selectedTask.status === "completed"
                  ? "bg-green-500"
                  : "bg-red-500"
              } text-white px-4 py-2 rounded-md`}
            >
              {selectedTask.status === "completed"
                ? "Markieren als nicht erledigt"
                : "Markieren als erledigt"}
            </button>
          </DialogContent>
        </Dialog>
      )}

      {/* Pop-up für das Bearbeiten einer Aufgabe */}
      {editedTask && (
        <Dialog
          open={Boolean(editedTask)}
          onOpenChange={(open) => setEditedTask(open ? editedTask : null)}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editiere Aufgabe</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleEditTask}>
              <input
                type="text"
                value={editedTask.name}
                onChange={(e) =>
                  setEditedTask({ ...editedTask, name: e.target.value })
                }
                className="p-2 mb-4 border border-gray-300 rounded-md w-full"
              />
              <textarea
                value={editedTask.description}
                onChange={(e) =>
                  setEditedTask({ ...editedTask, description: e.target.value })
                }
                className="p-2 mb-4 border border-gray-300 rounded-md w-full"
              />
              <input
                type="date"
                value={editedTask.dueDate}
                onChange={(e) =>
                  setEditedTask({ ...editedTask, dueDate: e.target.value })
                }
                className="p-2 mb-4 border border-gray-300 rounded-md w-full"
              />
              <input
                type="time"
                value={editedTask.time}
                onChange={(e) =>
                  setEditedTask({ ...editedTask, time: e.target.value })
                }
                className="p-2 mb-4 border border-gray-300 rounded-md w-full"
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

      {/* Wichtige Komponente beibehalten */}
      <SheetWithCreateTask />
    </div>
  );
};

export default DailyTaskList;
