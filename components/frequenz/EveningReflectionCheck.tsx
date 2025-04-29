// components/EveningReflectionCheck.tsx
import React, { useState } from "react";
import { calculateTrustPoints } from "@/utils/frequenz/calculateTrustPoints";

interface EveningReflectionCheckProps {
  forbiddenBehaviors: string[];
  onSubmit?: (results: { [behavior: string]: boolean }) => void; // optional, falls Parent noch was braucht
}

const EveningReflectionCheck: React.FC<EveningReflectionCheckProps> = ({ forbiddenBehaviors, onSubmit }) => {
  const [responses, setResponses] = useState<{ [behavior: string]: boolean }>({});
  const [loading, setLoading] = useState(false);

  const handleChange = (behavior: string, kept: boolean) => {
    setResponses(prev => ({ ...prev, [behavior]: kept }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { delta, details } = calculateTrustPoints(responses);

      // Trust Tank aktualisieren
      const res = await fetch("/api/trustReserve/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ delta, details }),
      });

      if (!res.ok) throw new Error("Fehler beim Speichern des Trust Reserve Tanks");

      if (onSubmit) onSubmit(responses);
      alert(`Trust Tank aktualisiert: ${delta > 0 ? "+" : ""}${delta} Punkte`);

      setResponses({});
    } catch (err) {
      console.error(err);
      alert("Fehler beim Aktualisieren des Trust Tanks");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-2xl font-semibold mb-4 text-gray-800">Abendliche Frequenz-Checkliste</h2>

      {forbiddenBehaviors.length === 0 ? (
        <p className="text-gray-600">Keine Verhaltensregeln definiert.</p>
      ) : (
        <div className="space-y-6">
          {forbiddenBehaviors.map((behavior, index) => (
            <div key={index} className="flex flex-col gap-2">
              <p className="font-medium text-gray-700">{behavior}</p>
              <div className="flex gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name={behavior}
                    value="kept"
                    checked={responses[behavior] === true}
                    onChange={() => handleChange(behavior, true)}
                  />
                  Nein, ich habe es NICHT getan ✅
                </label>

                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name={behavior}
                    value="broken"
                    checked={responses[behavior] === false}
                    onChange={() => handleChange(behavior, false)}
                  />
                  Ja, ich habe es getan ❌
                </label>
              </div>
            </div>
          ))}
        </div>
      )}

      {forbiddenBehaviors.length > 0 && (
        <button
          type="submit"
          disabled={loading}
          className="mt-6 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          {loading ? "Speichere..." : "Reflexion abschließen"}
        </button>
      )}
    </form>
  );
};

export default EveningReflectionCheck;
