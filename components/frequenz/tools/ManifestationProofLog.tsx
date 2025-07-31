import React, { useState } from "react";
import { ManifestationProof } from "@/utils/frequenz/frequencyModels";

interface Props {
  initial?: ManifestationProof[];
}

const ManifestationProofLog: React.FC<Props> = ({ initial = [] }) => {
  const [entries, setEntries] = useState<ManifestationProof[]>(initial);
  const [proof, setProof] = useState("");
  const [category, setCategory] = useState<ManifestationProof["category"]>();

  const addEntry = () => {
    const newEntry: ManifestationProof = {
      date: new Date(),
      proof,
      category,
    };
    setEntries((prev) => [newEntry, ...prev]);
    setProof("");
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow space-y-4">
      <h2 className="text-2xl font-semibold">Manifestation Proof Log</h2>
      <div className="flex gap-2">
        <input
          type="text"
          className="flex-1 border p-2 rounded"
          placeholder="Beweis des Tages"
          value={proof}
          onChange={(e) => setProof(e.target.value)}
        />
        <select
          className="border p-2 rounded"
          value={category}
          onChange={(e) => setCategory(e.target.value as any)}
        >
          <option value="">Kategorie</option>
          <option value="visuell">visuell</option>
          <option value="zufall">zufall</option>
          <option value="synchronicity">synchronicity</option>
          <option value="emotion">emotion</option>
        </select>
        <button
          onClick={addEntry}
          className="bg-purple-600 text-white px-4 py-2 rounded"
        >
          Hinzufügen
        </button>
      </div>

      <ul className="space-y-2">
        {entries.map((e, idx) => (
          <li key={idx} className="border p-2 rounded">
            <span className="font-medium mr-2">{e.proof}</span>
            <span className="text-sm text-gray-500">{e.date.toLocaleDateString()}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ManifestationProofLog;