// pages/goal/index.tsx
import React, { useState, useEffect } from "react";
import { GoalDocument } from "@/utils/interface";
import ProgressBar from "./progressBar";
const GoalManager1 = () => {
  const [goals, setGoals] = useState<GoalDocument[]>([]);
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    fetch("/api/goals/getGoalsWithProgress")
      .then((res) => res.json())
      .then((data) => {
        setGoals(data.goals);
      })
      .catch((error) => console.error("Fehler beim Abrufen der Ziele:", error));
  }, []);

  const filteredGoals = goals.filter((goal) => {
    if (filter === "all") return true;
    return goal.type === filter;
  });

  return (
    <div className="max-w-4xl mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6 text-center">Zielübersicht</h1>

      {/* Filter für Ziel-Typen */}
      <div className="flex justify-center gap-4 mb-6">
        {["all", "daily", "weekly", "monthly", "yearly"].map((type) => (
          <button
            key={type}
            onClick={() => setFilter(type)}
            className={`px-4 py-2 rounded-lg ${
              filter === type ? "bg-blue-600 text-white" : "bg-gray-300"
            }`}
          >
            {type === "all" ? "Alle Ziele" : type.charAt(0).toUpperCase() + type.slice(1) + " Ziele"}
          </button>
        ))}
      </div>

      {/* Ziele anzeigen */}
      {filteredGoals.length > 0 ? (
        <div className="space-y-4">
          {filteredGoals.map((goal) => (
            <div key={goal._id.toString()} className="bg-white p-4 rounded-lg shadow">
              <h2 className="text-xl font-semibold">{goal.title}</h2>
              <p className="text-gray-600 mb-2">{goal.description}</p>
              <ProgressBar progress={goal.progress} />
              <p className="mt-2 text-sm text-gray-700">{goal.progress}% abgeschlossen</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-gray-600 text-center">Keine Ziele gefunden.</p>
      )}
    </div>
  );
};

export default GoalManager1;
