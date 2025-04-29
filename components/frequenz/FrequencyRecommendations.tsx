// FrequencyRecommendations.tsx
import React from "react";
import { toast } from "react-toastify";

type FrequencyRecommendation = {
  title: string;
  description: string;
  category: "Mindset" | "Körper" | "Emotion" | "Verhalten";
  gapReason: string;
  basedOn: string;
};

interface FrequencyRecommendationsProps {
  recommendations: FrequencyRecommendation[];
  userId: string; // Nutzer-ID für die Aufgaben-Zuordnung
  onTaskCreated?: () => void; // Optional: Callback nach Task-Erstellung
}

const FrequencyRecommendations: React.FC<FrequencyRecommendationsProps> = ({ recommendations, userId, onTaskCreated }) => {
  
    async function handleAcceptRecommendation(rec: FrequencyRecommendation) {
        try {
          const response = await fetch("/api/frequencyTask/create", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ recommendation: rec, userId }),
          });
      
          if (!response.ok) {
            const errorText = await response.text();
            console.error("Fehler beim Erstellen der Frequenz-Task:", errorText);
            toast.error("Fehler beim Erstellen der Frequenz-Aufgabe");
            return;
          }
      
          console.log("Aufgabe erfolgreich erstellt!");
      
          if (onTaskCreated) {
            onTaskCreated(); // optional: z.B. ToDo-Liste neu laden
          }
      
          toast.success("Frequenz-Aufgabe erfolgreich erstellt! 🎯");
      
        } catch (error) {
          console.error("Netzwerk- oder Serverfehler:", error);
          toast.error("Ein unerwarteter Fehler ist aufgetreten");
        }
      }
      

  return (
    <div className="bg-white p-6 rounded-lg shadow-md space-y-6">
      <h2 className="text-2xl font-semibold text-gray-800">Deine Empfehlungen für heute</h2>
      {recommendations.length === 0 ? (
        <p className="text-gray-500">Keine besonderen Empfehlungen – du bist nah an deinem Ideal! 🌟</p>
      ) : (
        recommendations.map((rec, idx) => (
          <div key={idx} className="border rounded-md p-4 bg-gray-50">
            <h3 className="text-xl font-bold text-green-700">{rec.title}</h3>
            <p className="mt-1 text-gray-700">{rec.description}</p>
            <p className="text-sm italic text-gray-500 mt-2">Grund: {rec.gapReason}</p>
            <button
              onClick={() => handleAcceptRecommendation(rec)}
              className="mt-4 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              Als Aufgabe übernehmen
            </button>
          </div>
        ))
      )}
    </div>
  );
};

export default FrequencyRecommendations;
