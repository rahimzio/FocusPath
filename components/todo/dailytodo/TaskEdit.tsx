import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Task } from "@/utils/interface";

interface Props {
  editedTask: Task | null;
  userId: string;
  setEditedTask: (task: Task | null) => void;
  handleEditTask: (event: React.FormEvent) => void;
}

const TaskEditModal: React.FC<Props> = ({ userId, editedTask, setEditedTask, handleEditTask }) => {
  if (!editedTask) return null;

  return (
    <Dialog open={!!editedTask} onOpenChange={(open) => setEditedTask(open ? editedTask : null)}>
      <DialogContent className="text-white bg-neutral-900 max-h-[90vh] overflow-y-auto sm:w-[90vw] md:w-[600px]">
        <DialogHeader>
          <DialogTitle className="text-white">Aufgabe bearbeiten</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleEditTask} className="mt-4 space-y-6">
          {/* 📝 Allgemeine Informationen */}
          <div className="space-y-2">
            <h3 className="text-sm uppercase font-bold text-neutral-400">📝 Allgemeine Informationen</h3>
            <label className="text-xs text-neutral-300">Name der Aufgabe</label>
            <input
              type="text"
              value={editedTask.name}
              onChange={(e) => setEditedTask({ ...editedTask, name: e.target.value })}
              className="p-2 border border-gray-700 rounded-md w-full bg-neutral-800 text-white"
              placeholder="Aufgabenname"
              required
            />
            <label className="text-xs text-neutral-300">Beschreibung</label>
            <textarea
              value={editedTask.description ?? ""}
              onChange={(e) => setEditedTask({ ...editedTask, description: e.target.value })}
              className="p-2 border border-gray-700 rounded-md w-full bg-neutral-800 text-white"
              placeholder="Beschreibung"
            />
            <label className="text-xs text-neutral-300">Kategorie</label>
            <input
              type="text"
              value={editedTask.category}
              onChange={(e) => setEditedTask({ ...editedTask, category: e.target.value })}
              className="p-2 border border-gray-700 rounded-md w-full bg-neutral-800 text-white"
              placeholder="Kategorie"
            />
          </div>

          {/* ⏰ Zeit & Wiederholung */}
          <div className="space-y-2">
            <h3 className="text-sm uppercase font-bold text-neutral-400">⏰ Zeit & Wiederholung</h3>
            <label className="text-xs text-neutral-300">Fälligkeitsdatum</label>
            <input
              type="date"
              value={editedTask.dueDate}
              onChange={(e) => setEditedTask({ ...editedTask, dueDate: e.target.value })}
              className="p-2 border border-gray-700 rounded-md w-full bg-neutral-800 text-white"
              required
            />
            <label className="text-xs text-neutral-300">Startzeit</label>
            <input
              type="time"
              value={editedTask.time ?? ""}
              onChange={(e) => setEditedTask({ ...editedTask, time: e.target.value })}
              className="p-2 border border-gray-700 rounded-md w-full bg-neutral-800 text-white"
              placeholder="Startzeit"
            />
            <label className="text-xs text-neutral-300">Dauer</label>
            <input
              type="time"
              value={editedTask.duration || ""}
              onChange={(e) => setEditedTask({ ...editedTask, duration: e.target.value })}
              className="p-2 border border-gray-700 rounded-md w-full bg-neutral-800 text-white"
              placeholder="Dauer"
            />
            <label className="text-xs text-neutral-300">Wiederholung</label>
            <select
              value={editedTask.frequency}
              onChange={(e) =>
                setEditedTask({
                  ...editedTask,
                  frequency: e.target.value as Task["frequency"],
                })
              }
              className="p-2 border border-gray-700 rounded-md w-full bg-neutral-800 text-white"
              required
            >
              <option value="once">Einmalig</option>
              <option value="daily">Täglich</option>
              <option value="weekly">Wöchentlich</option>
              <option value="monthly">Monatlich</option>
              <option value="yearly">Jährlich</option>
            </select>
          </div>

          {/* 🎯 Bewertung & Farbe */}
          <div className="space-y-2">
            <h3 className="text-sm uppercase font-bold text-neutral-400">🎯 Bewertung & Farbe</h3>
            <label className="text-xs text-neutral-300">Punkte</label>
            <input
              type="number"
              value={editedTask.points}
              onChange={(e) =>
                setEditedTask({
                  ...editedTask,
                  points: parseInt(e.target.value, 10) || 0,
                })
              }
              className="p-2 border border-gray-700 rounded-md w-full bg-neutral-800 text-white"
              placeholder="Punkte"
              min={0}
              required
            />
            <label className="text-xs text-neutral-300">Farbe</label>
            <input
              type="color"
              value={editedTask.color}
              onChange={(e) => setEditedTask({ ...editedTask, color: e.target.value })}
              className="p-2 border border-gray-700 rounded-md w-full bg-neutral-800"
              required
            />
          </div>

          <button type="submit" className="bg-green-500 text-white px-4 py-2 rounded-md w-full">
            Speichern
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default TaskEditModal;
