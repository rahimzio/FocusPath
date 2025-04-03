"use client";
import ProgressBar from "@/components/todo/ProgressBar";
import { GoalWithProgress } from "@/utils/interface";

interface GoalsWithProgressProps {
  goals: GoalWithProgress[];
  onEditGoal: (goal: GoalWithProgress) => void;
}

export default function GoalsWithProgress({ goals, onEditGoal }: GoalsWithProgressProps) {
  return (
    <div className="space-y-4">
      {goals.length > 0 ? (
        goals.map((goal) => (
          <div key={goal._id} className="bg-white p-4 rounded-lg shadow-md border-l-4 border-blue-500">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">{goal.title}</h3>
              <button
                onClick={() => onEditGoal(goal)}
                className="text-blue-500 hover:text-blue-700"
              >
                ✏️ Bearbeiten
              </button>
            </div>
            <ProgressBar progress={goal.progress} />
            <p className="mt-2 text-sm text-gray-700">{goal.progress}% abgeschlossen</p>
          </div>
        ))
      ) : (
        <p className="text-gray-600 text-center">Keine Ziele vorhanden.</p>
      )}
    </div>
  );
}
