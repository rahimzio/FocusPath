import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { GoalWithProgress } from "@/utils/interface";

interface Props {
  editedGoal: GoalWithProgress | null;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  setEditedGoal: (goal: GoalWithProgress | null) => void;
  handleEditGoal: (event: React.FormEvent) => Promise<void>;
}

const GoalEditModal: React.FC<Props> = ({
  editedGoal,
  isOpen,
  setIsOpen,
  setEditedGoal,
  handleEditGoal,
}) => {
  if (!editedGoal) return null;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>🎯 Ziel bearbeiten</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleEditGoal} className="mt-4 space-y-4 text-black">
          {/* 🏷️ Titel */}
          <div>
            <label className="block font-semibold text-gray-700 mb-1">
              🏷️ Titel
            </label>
            <input
              type="text"
              value={editedGoal.title}
              onChange={(e) =>
                setEditedGoal({ ...editedGoal, title: e.target.value })
              }
              className="p-2 border border-gray-300 rounded-md w-full"
              placeholder="Zieltitel"
              required
            />
          </div>

          {/* ✏️ Beschreibung */}
          <div>
            <label className="block font-semibold text-gray-700 mb-1">
              ✏️ Beschreibung
            </label>
            <textarea
              value={editedGoal.description}
              onChange={(e) =>
                setEditedGoal({ ...editedGoal, description: e.target.value })
              }
              className="p-2 border border-gray-300 rounded-md w-full"
              placeholder="Zielbeschreibung"
              required
            />
          </div>

          {/* 💾 Speichern */}
          <div className="pt-4">
            <button
              type="submit"
              className="bg-green-500 text-white px-4 py-2 rounded-md w-full"
            >
              Speichern
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default GoalEditModal;
