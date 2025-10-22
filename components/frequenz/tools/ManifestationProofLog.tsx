'use client';

import { ManifestationProof } from '@/utils/interfaces/frequency';
import React, { useMemo, useState } from 'react';

interface Props {
  initial?: ManifestationProof[];
}

const CATEGORIES: Array<NonNullable<ManifestationProof['category']>> = [
  'visuell',
  'zufall',
  'synchronicity',
  'emotion',
];

function fmtDateSafe(d: unknown) {
  try {
    const date =
      d instanceof Date ? d : typeof d === 'string' ? new Date(d) : new Date();
    return new Intl.DateTimeFormat('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
    }).format(date);
  } catch {
    return String(d ?? '');
  }
}

export const ManifestationProofLog: React.FC<Props> = ({ initial = [] }) => {
  const [entries, setEntries] = useState<ManifestationProof[]>(initial);
  const [proof, setProof] = useState('');
  const [category, setCategory] =
    useState<ManifestationProof['category'] | ''>('');

  const canAdd = useMemo(() => proof.trim().length > 0, [proof]);

  const addEntry = () => {
    if (!canAdd) return;
    const newEntry: ManifestationProof = {
      date: new Date(),
      proof: proof.trim(),
      category: (category || undefined) as ManifestationProof['category'],
    };
    setEntries((prev) => [newEntry, ...prev]);
    setProof('');
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addEntry();
    }
  };

  return (
    <section className="bg-white p-4 sm:p-6 rounded-lg shadow space-y-4">
      <h2 className="text-lg sm:text-2xl font-semibold">Manifestation Proof Log</h2>

      {/* Eingabe – mobil gestapelt, auf Desktop nebeneinander */}
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          type="text"
          className="w-full sm:flex-1 border px-3 py-2 rounded"
          placeholder="Beweis des Tages"
          value={proof}
          onChange={(e) => setProof(e.target.value)}
          onKeyDown={onKeyDown}
          aria-label="Beweis eingeben"
        />

        <select
          className="w-full sm:w-auto border px-3 py-2 rounded"
          value={category}
          onChange={(e) => setCategory(e.target.value as any)}
          aria-label="Kategorie wählen"
        >
          <option value="">Kategorie</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        <button
          onClick={addEntry}
          disabled={!canAdd}
          className="w-full sm:w-auto bg-purple-600 text-white px-4 py-2 rounded disabled:opacity-50"
          aria-disabled={!canAdd}
        >
          Hinzufügen
        </button>
      </div>

      {/* Liste */}
      <ul className="space-y-2">
        {entries.map((e, idx) => (
          <li
            key={idx}
            className="border p-3 rounded flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1"
          >
            <div className="min-w-0">
              <span className="font-medium mr-2 break-words">{e.proof}</span>
              {e.category ? (
                <span className="inline-block text-[11px] px-2 py-0.5 rounded-full border bg-gray-50 text-gray-700">
                  {e.category}
                </span>
              ) : null}
            </div>
            <span className="text-sm text-gray-500 shrink-0">
              {fmtDateSafe(e.date)}
            </span>
          </li>
        ))}
        {entries.length === 0 && (
          <li className="text-sm text-gray-500">Noch keine Einträge.</li>
        )}
      </ul>
    </section>
  );
};

export default ManifestationProofLog;
