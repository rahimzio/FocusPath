import React, { useState, useEffect } from "react";
import { Goal } from "@/utils/interface";
import { format } from "date-fns";

interface Props {
  goal: Goal;
  onClose: () => void;
  onSave: (updatedGoal: Partial<Goal>) => void;
}

const GoalEditModal: React.FC<Props> = ({ goal, onClose, onSave }) => {
  const [title, setTitle] = useState(goal.title);
  const [description, setDescription] = useState(goal.description);
  const [startDate, setStartDate] = useState(goal.startDate);
  const [endDate, setEndDate] = useState(goal.endDate);

  const handleSubmit = () => {
    onSave({
      _id: goal._id,
      title,
      description,
      startDate,
      endDate,
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded shadow-md w-full max-w-md">
        <h2 className="text-lg font-semibold mb-4">Ziel bearbeiten</h2>
        <div className="space-y-3">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full border px-3 py-2 rounded"
            placeholder="Titel"
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full border px-3 py-2 rounded"
            placeholder="Beschreibung"
          />
          <div className="flex gap-2">
            <input
              type="date"
              value={format(new Date(startDate), "yyyy-MM-dd")}
              onChange={(e) => setStartDate(e.target.value)}
              className="border px-2 py-1 rounded w-1/2"
            />
            <input
              type="date"
              value={format(new Date(endDate), "yyyy-MM-dd")}
              onChange={(e) => setEndDate(e.target.value)}
              className="border px-2 py-1 rounded w-1/2"
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-200 rounded hover:bg-gray-300"
          >
            Abbrechen
          </button>
          <button
            onClick={handleSubmit}
            className="px-4 py-2 text-white bg-blue-600 rounded hover:bg-blue-700"
          >
            Speichern
          </button>
        </div>
      </div>
    </div>
  );
};

export default GoalEditModal;
