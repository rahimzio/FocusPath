import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Task } from "@/utils/interface";

interface Props {
  editedTask: Task | null;
  userId:string;
  setEditedTask: (task: Task | null) => void;
  handleEditTask: (event: React.FormEvent) => void;
}

const TaskEditModal: React.FC<Props> = ({ userId, editedTask, setEditedTask, handleEditTask }) => {
  if (!editedTask) return null;

  return (
    <Dialog open={!!editedTask} onOpenChange={(open) => setEditedTask(open ? editedTask : null)}>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Aufgabe bearbeiten</DialogTitle>
      </DialogHeader>
      <form onSubmit={handleEditTask} className="mt-4 space-y-4 text-black">
        <input
          type="text"
          value={editedTask.name}
          onChange={(e) => setEditedTask({ ...editedTask, name: e.target.value })}
          className="p-2 border border-gray-300 rounded-md w-full"
          placeholder="Aufgabenname"
          required
        />
        <textarea
          value={editedTask.description ?? ""}
          onChange={(e) => setEditedTask({ ...editedTask, description: e.target.value })}
          className="p-2 border border-gray-300 rounded-md w-full"
          placeholder="Beschreibung"
        />
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
        <input
          type="color"
          value={editedTask.color}
          onChange={(e) =>
            setEditedTask({
              ...editedTask,
              color: e.target.value,
            })
          }
          className="p-2 border border-gray-300 rounded-md w-full"
          required
        />
          <input
            type="time"
            value={editedTask.duration || ""}
            onChange={(e) => setEditedTask({ ...editedTask, duration: e.target.value })}
            className="p-2 border border-gray-300 rounded-md w-full"
          />
        <input
          type="date"
          value={editedTask.dueDate}
          onChange={(e) => setEditedTask({ ...editedTask, dueDate: e.target.value })}
          className="p-2 border border-gray-300 rounded-md w-full"
          required
        />
        <input
          type="time"
          value={editedTask.time ?? ""}
          onChange={(e) => setEditedTask({ ...editedTask, time: e.target.value })}
          className="p-2 border border-gray-300 rounded-md w-full"
        />
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
          <input
            type="text"
            value={editedTask.category}
            onChange={(e) => setEditedTask({ ...editedTask, category: e.target.value })}
            className="p-2 border border-gray-300 rounded-md w-full"
            placeholder="Kategorie"
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
  );
};

export default TaskEditModal;
