// components/goals/SubtaskModal.tsx
import { Task, SubTask } from "@/utils/interfaces/task";
import React from "react";

interface Props {
  task: Task | null;
  newSubTasks: SubTask[];
  setNewSubTasks: (subTasks: SubTask[]) => void;
  onChangeSubTask: (index: number, field: keyof SubTask, value: any) => void;
  onAddSubTaskRow: () => void;
  onSaveSubTasks: () => void;
  onClose: () => void;
}

export default function SubtaskModal({
  task,
  newSubTasks,
  setNewSubTasks,
  onChangeSubTask,
  onAddSubTaskRow,
  onSaveSubTasks,
  onClose,
}: Props) {
  if (!task) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center p-4 z-50">
      <div className="bg-white w-full max-w-lg p-4 rounded shadow">
        <h2 className="text-lg font-bold mb-2">Subtasks verwalten</h2>

        <div className="flex flex-col space-y-2">
          {newSubTasks.map((st, idx) => (
            <div key={st._id} className="border p-2 rounded">
              <label className="block text-sm font-medium">
                Name
                <input
                  type="text"
                  className="block w-full border rounded p-1"
                  value={st.name}
                  onChange={(e) =>
                    onChangeSubTask(idx, "name", e.target.value)
                  }
                />
              </label>
            </div>
          ))}
        </div>

        <button
          onClick={onAddSubTaskRow}
          className="mt-3 bg-gray-600 text-white px-2 py-1 rounded hover:bg-gray-700 text-sm"
        >
          + Weitere Zeile
        </button>

        <div className="mt-4 flex justify-end space-x-2">
          <button
            onClick={onClose}
            className="border px-4 py-1 rounded"
          >
            Abbrechen
          </button>
          <button
            onClick={onSaveSubTasks}
            className="bg-blue-700 text-white px-4 py-1 rounded hover:bg-blue-800"
          >
            Speichern
          </button>
        </div>
      </div>
    </div>
  );
}
