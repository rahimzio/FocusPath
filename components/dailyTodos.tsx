"use client";

import { useState, useEffect } from "react";
import { Task } from "@/utils/interface";
import SheetWithCreateTask from "./todo/popUpCreateTask"; // Importiere das PopUp zum Erstellen von Aufgaben
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog"; // Importiere Dialog-Komponenten

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
  const [viewType, setViewType] = useState<
    "daily" | "weekly" | "monthly" | "yearly"
  >("daily");
  const [selectedTask, setSelectedTask] = useState<Task | null>(null); // Zustand für das Pop-up
  const [editedTask, setEditedTask] = useState<Task | null>(null); // Zustand für die bearbeitete Aufgabe

  useEffect(() => {
    fetch("/api/task/getTask")
      .then((response) => response.json())
      .then((data: UserData) => {
        const today = new Date().toISOString().split("T")[0]; // Heutiges Datum
        const dailyTasks = data.structuredKlonData.dailyTasks || [];

        // Aufgaben ohne Uhrzeit (timebased: false)
        const tasksWithoutTime = dailyTasks.filter((task) => !task.timebased);

        // Aufgaben mit Uhrzeit und Heutigem Datum
        const tasksWithTime = dailyTasks.filter(
          (task) => task.timebased && task.dueDate === today
        );

        // Sortiere Aufgaben mit Uhrzeit nach Zeit
        tasksWithTime.sort((a, b) => a.time.localeCompare(b.time));

        // Kombiniere Aufgaben ohne und mit Uhrzeit
        const allTasks = [...tasksWithoutTime, ...tasksWithTime];

        setTasks(allTasks);
      })
      .catch((error) => {
        console.error("Fehler beim Abrufen der Daten:", error);
        setTasks([]); // Fallback auf ein leeres Array bei einem Fehler
      });
  }, [viewType]);

  const handleTaskCheck = async (taskId: string, checked: boolean) => {
    try {
      const response = await fetch(`/api/task/updateStatus/${taskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: checked ? "completed" : "incomplete" }),
      });

      if (response.ok) {
        setTasks((prevTasks) =>
          prevTasks.map((task) =>
            task._id === taskId
              ? { ...task, status: checked ? "completed" : "incomplete" }
              : task
          )
        );
      } else {
        console.error("Fehler beim Aktualisieren des Aufgabenstatus");
      }
    } catch (error) {
      console.error("Fehler beim Senden der Anfrage:", error);
    }
  };

  // Funktion zum Öffnen des Pop-up Modals für detaillierte Ansicht
  const openTaskDetails = (task: Task) => {
    setSelectedTask(task); // Setze die ausgewählte Aufgabe für das Pop-up
  };

  // Funktion zum Öffnen des Editier-Dialogs
  const openEditDialog = (task: Task) => {
    setEditedTask(task); // Setze die Aufgabe zur Bearbeitung
  };

  const handleEditTask = async (event: React.FormEvent) => {
    event.preventDefault();

    if (editedTask) {
      const response = await fetch(`/api/task/updateTask`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editedTask),
      });

      if (response.ok) {
        setTasks((prevTasks) =>
          prevTasks.map((task) =>
            task._id === editedTask._id ? editedTask : task
          )
        );
        setEditedTask(null); // Schließe das Editieren
        setSelectedTask(null); // Schließe das Pop-up
      } else {
        alert("Fehler beim Bearbeiten der Aufgabe");
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Container für Aufgaben ohne Uhrzeit */}
      <div className="sticky top-0 bg-gray-100 p-4 rounded-lg shadow-md z-10 mb-10">
        <h2 className="text-xl font-semibold mb-4 text-gray-700">
          Aufgaben ohne Uhrzeit
        </h2>
        <div className="space-y-4 overflow-y-auto max-h-[300px]">
          {tasks.length > 0 ? (
            tasks
              .filter((task) => !task.timebased)
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
          Aufgaben für den heutigen Tag
        </h2>
        <div className="space-y-4 overflow-y-auto max-h-[300px]">
          {tasks.length > 0 ? (
            tasks
              .filter(
                (task) =>
                  task.timebased &&
                  task.dueDate === new Date().toISOString().split("T")[0]
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
                    Fällig am: {task.dueDate} um {task.time}
                  </p>
                </div>
              ))
          ) : (
            <p className="text-sm text-gray-500">
              Keine Aufgaben für heute mit Uhrzeit gefunden.
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
              {/* Weitere Felder für das Bearbeiten der Aufgabe hier */}
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

      <SheetWithCreateTask />
    </div>
  );
};

export default DailyTaskList;
