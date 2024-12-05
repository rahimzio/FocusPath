"use client";

import { useState, useEffect } from "react";
import { Task } from "@/utils/interface";
import SheetWithCreateTask from "./todo/popUpCreateTask"; // Importiere das PopUp zum Erstellen von Aufgaben
import DailyTaskListHeader from "./todo/dailyToDoHeader";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog"; // Importiere Dialog-Komponenten
import Calendar from "react-calendar"; // Importiere den Kalender
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
  const [selectedTask, setSelectedTask] = useState<Task | null>(null); // Zustand für das Pop-up
  const [editedTask, setEditedTask] = useState<Task | null>(null); // Zustand für die bearbeitete Aufgabe
  const [showCalendar, setShowCalendar] = useState(false); // Zustand für das Anzeigen des Kalenders
  const [selectedDate, setSelectedDate] = useState<string>(""); // Zustand für das ausgewählte Datum

  // Hilfsfunktion zum Formatieren des Datums im Format YYYY-MM-DD
  const formatDate = (date: Date) => {
    return (
      date.getFullYear() +
      "-" +
      ("0" + (date.getMonth() + 1)).slice(-2) +
      "-" +
      ("0" + date.getDate()).slice(-2)
    );
  };

  // Aktuelles Datum formatieren
  const today = formatDate(new Date());

  const fetchTasks = () => {
    fetch("/api/task/getTask")
      .then((response) => response.json())
      .then((data: UserData) => {
        const dailyTasks = data.structuredKlonData.dailyTasks || [];
        setTasks(dailyTasks);
      })
      .catch((error) => {
        console.error("Fehler beim Abrufen der Daten:", error);
        setTasks([]); // Fallback auf ein leeres Array bei einem Fehler
      });
  };

  useEffect(() => {
    fetchTasks();
  }, []); // useEffect wird nur einmal beim Laden der Komponente ausgeführt

  const handleTaskCheck = async (taskId: string, checked: boolean) => {
    try {
      const response = await fetch(`/api/task/updateTask?taskId=${taskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: checked ? "completed" : "incomplete" }),
      });

      if (response.ok) {
        fetchTasks(); // Aufgabenliste aktualisieren
      } else {
        console.error("Fehler beim Aktualisieren des Aufgabenstatus");
      }
    } catch (error) {
      console.error("Fehler beim Senden der Anfrage:", error);
    }
  };

  const openTaskDetails = (task: Task) => {
    setSelectedTask(task); // Setze die ausgewählte Aufgabe für das Pop-up
  };

  const openEditDialog = (task: Task) => {
    setEditedTask(task); // Setze die Aufgabe zur Bearbeitung
  };

  const handleEditTask = async (event: React.FormEvent) => {
    event.preventDefault();

    // Überprüfen Sie, ob die Aufgabe bearbeitet werden soll
    if (!editedTask) {
      console.error("Keine Aufgabe zum Bearbeiten ausgewählt");
      return;
    }

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

      console.log("Aufgabe erfolgreich aktualisiert");

      setEditedTask(null); // Schließe das Bearbeitungsdialog
      setSelectedTask(null); // Schließe das Pop-up
      fetchTasks(); // Aufgabenliste aktualisieren
    } catch (error) {
      console.error("Fehler beim Senden der Anfrage:", error);
      alert("Fehler beim Bearbeiten der Aufgabe.");
    }
  };

  const handleDateChange = (date: Value) => {
    if (date && date instanceof Date) {
      const formattedDate = formatDate(date);
      setSelectedDate(formattedDate);
      setShowCalendar(false); // Schließe den Kalender nach der Auswahl
    }
  };

  // Funktion zum Abrufen des anzuzeigenden Datums
  const displayDate = selectedDate || today;

  return (
    <div className="space-y-6">
      <div className="flex flex-row">
        <div
          className="cursor-pointer font-semibold text-lg"
          onClick={() => setShowCalendar(!showCalendar)}
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
              .filter(
                (task) => !task.timebased && task.dueDate === displayDate // Filter nach Datum
              )
              .map((task) => (
                <div
                  key={task._id}
                  onClick={() => openTaskDetails(task)} // Öffne das Pop-up
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
              .filter(
                (task) => task.timebased && task.dueDate === displayDate // Filter nach Datum
              )
              .sort((a, b) => a.time.localeCompare(b.time)) // Sortiere nach Uhrzeit
              .map((task) => (
                <div
                  key={task._id}
                  onClick={() => openTaskDetails(task)} // Öffne das Pop-up
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
          onOpenChange={(open) => setSelectedTask(open ? selectedTask : null)}
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
                  setEditedTask({
                    ...editedTask,
                    description: e.target.value,
                  })
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

      {/* Wichtig: Behalte die SheetWithCreateTask-Komponente bei */}
      <SheetWithCreateTask />
    </div>
  );
};

export default DailyTaskList;
