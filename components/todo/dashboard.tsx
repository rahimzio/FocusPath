// components/Dashboard.tsx
"use client";

import { useState, useEffect } from "react";
import { Goal, Task } from "@/utils/interface";
import ProgressBar from "./ProgressBar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from 'react-toastify';
import { FaEdit } from "react-icons/fa"; // Edit-Icon

const Dashboard = () => {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [currentGoal, setCurrentGoal] = useState<Goal | null>(null);
  const [editedTitle, setEditedTitle] = useState("");
  const [editedDescription, setEditedDescription] = useState("");

  // Fetch Goals
  async function fetchGoals() {
    try {
      const response = await fetch("/api/goals/getGoals");
      if (!response.ok) {
        const errorText = await response.text();
        console.error("Fehler beim Abrufen der Ziele:", errorText);
        toast.error("Fehler beim Abrufen der Ziele.");
        return;
      }
      const data = await response.json();
      setGoals(data.goals);
    } catch (error) {
      console.error("Fetch error:", error);
      toast.error("Fehler beim Abrufen der Ziele.");
    }
  }

  // Fetch Tasks
  async function fetchTasksForGoals() {
    try {
      const response = await fetch("/api/task/getAllTasks");
      if (!response.ok) {
        const errorText = await response.text();
        console.error("Fehler beim Abrufen der Tasks:", errorText);
        toast.error("Fehler beim Abrufen der Aufgaben.");
        return;
      }
      const data = await response.json();
      setTasks(data.tasks);
    } catch (error) {
      console.error("Fetch error:", error);
      toast.error("Fehler beim Abrufen der Aufgaben.");
    }
  }

  useEffect(() => {
    fetchGoals();
    fetchTasksForGoals();
  }, []);

  // Berechne den Fortschritt für jedes Ziel
  const calculateProgress = (goalId: string): number => {
    const tasksForGoal = tasks.filter(task => task.goalId === goalId);
    if (tasksForGoal.length === 0) return 0;
    const completedTasks = tasksForGoal.filter(task => task.status === "completed");
    return Math.round((completedTasks.length / tasksForGoal.length) * 100);
  };

  // Öffne den Edit-Dialog
  const openEditDialog = (goal: Goal) => {
    setCurrentGoal(goal);
    setEditedTitle(goal.title);
    setEditedDescription(goal.description);
    setIsEditDialogOpen(true);
  };

  // Handle Edit Form Submission
  const handleEditGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentGoal) return;

    try {
      const response = await fetch("/api/goal/updateGoal", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          goalId: currentGoal._id,
          title: editedTitle,
          description: editedDescription,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Fehler beim Aktualisieren des Ziels:", errorText);
        toast.error("Fehler beim Aktualisieren des Ziels.");
        return;
      }

      toast.success("Ziel erfolgreich aktualisiert!");
      setIsEditDialogOpen(false);
      fetchGoals(); // Aktualisiere die Ziele im State
    } catch (error) {
      console.error("Fehler beim Aktualisieren des Ziels:", error);
      toast.error("Ein unerwarteter Fehler ist aufgetreten.");
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {goals.map(goal => (
          <div key={goal._id} className="p-4 bg-white rounded-lg shadow-md">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">{goal.title}</h2>
              <button
                onClick={() => openEditDialog(goal)}
                className="text-blue-500 hover:text-blue-700"
              >
                <FaEdit />
              </button>
            </div>
            <p className="text-gray-600 mb-4">{goal.description}</p>
            <ProgressBar progress={calculateProgress(goal._id)} />
            <p className="mt-2 text-sm text-gray-700">
              {calculateProgress(goal._id)}% abgeschlossen
            </p>
          </div>
        ))}
      </div>

      {/* Edit-Dialog */}
      {isEditDialogOpen && currentGoal && (
        <Dialog
          open={isEditDialogOpen}
          onOpenChange={() => setIsEditDialogOpen(false)}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Ziel bearbeiten</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleEditGoal} className="mt-4 space-y-4">
              {/* Titel */}
              <input
                type="text"
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
                className="p-2 border border-gray-300 rounded-md w-full"
                placeholder="Zieltitel"
                required
              />

              {/* Beschreibung */}
              <textarea
                value={editedDescription}
                onChange={(e) => setEditedDescription(e.target.value)}
                className="p-2 border border-gray-300 rounded-md w-full"
                placeholder="Zielbeschreibung"
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
    </div>
  );
};

export default Dashboard;
