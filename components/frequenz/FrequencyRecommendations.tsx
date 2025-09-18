'use client';

import React from 'react';
import { toast } from 'react-toastify';

type FrequencyRecommendation = {
  title: string;
  description: string;
  category: 'Mindset' | 'Körper' | 'Emotion' | 'Verhalten';
  gapReason: string;
  basedOn: string;
};

interface FrequencyRecommendationsProps {
  recommendations: FrequencyRecommendation[];
  userId: string;                 // Nutzer-ID für die Aufgaben-Zuordnung
  onTaskCreated?: (rec?: FrequencyRecommendation) => void; // Optional: Callback nach Task-Erstellung
}

/** stabile ID aus Empfehlung konstruieren */
function recId(rec: FrequencyRecommendation) {
  return `${rec.title}::${rec.category}::${rec.basedOn}`;
}

export const FrequencyRecommendations: React.FC<FrequencyRecommendationsProps> = ({
  recommendations,
  userId,
  onTaskCreated,
}) => {
  // Tracke Busy-Status je Empfehlung (keine window-Hacks)
  const [busy, setBusy] = React.useState<Set<string>>(new Set());

  const setBusyFor = (id: string, isBusy: boolean) =>
    setBusy((prev) => {
      const next = new Set(prev);
      if (isBusy) next.add(id);
      else next.delete(id);
      return next;
    });

  async function createTaskFromRecommendation(
    rec: FrequencyRecommendation,
    isDont = false
  ) {
    const id = recId(rec);

    if (!userId) {
      toast.error('Bitte zuerst einloggen.');
      return;
    }
    if (busy.has(id)) return;

    setBusyFor(id, true);
    try {
      // Mappe eine Empfehlung auf das Task-Schema
      const task = {
        name: rec.title,
        points: 1,           // klein halten; Wirkung über Smoothing
        isDont,              // true = DON’T, false = DO
        frequency: 'daily' as const,
        timebased: false,
        category: 'Frequenz',
        isFrequencyTask: true,
        meta: {
          description: rec.description,
          category: rec.category,
          gapReason: rec.gapReason,
          basedOn: rec.basedOn,
          source: 'recommendation',
        },
      };

      const r = await fetch('/api/frequency/bulkCreateDaily', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, tasks: [task] }),
      });

      const j = await r.json().catch(() => null);
      if (!r.ok || !j?.ok) {
        const err = j?.error || `HTTP ${r.status}`;
        throw new Error(err);
      }

      toast.success(`Aufgabe übernommen: ${rec.title}`);
      onTaskCreated?.(rec);
    } catch (e: any) {
      console.error(e);
      toast.error(`Fehler beim Erstellen: ${e?.message ?? 'Unbekannter Fehler'}`);
    } finally {
      setBusyFor(id, false);
    }
  }

  return (
    <section className="bg-white p-3 sm:p-4 rounded-xl border">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <h2 className="text-lg sm:text-xl font-semibold text-gray-800">
          Deine Empfehlungen für heute
        </h2>
        {/* Optionaler Platzhalter für Filter/Info — lässt Layout ruhig wirken */}
        <div className="text-xs text-gray-500 hidden sm:block" aria-hidden>
          Vorschläge basieren auf heutigen Abweichungen & Mustern
        </div>
      </header>

      {/* Empty state */}
      {recommendations.length === 0 ? (
        <p className="mt-2 text-gray-500">
          Keine besonderen Empfehlungen – du bist nah an deinem Ideal! 🌟
        </p>
      ) : (
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          {recommendations.map((rec) => {
            const id = recId(rec);
            const isBusy = busy.has(id);

            return (
              <article
                key={id}
                className="border rounded-lg p-3 sm:p-4 bg-gray-50 flex flex-col"
                aria-busy={isBusy}
              >
                <header className="space-y-1">
                  <h3 className="text-base sm:text-lg font-semibold text-emerald-700">
                    {rec.title}
                  </h3>
                  <p className="text-sm text-gray-700">{rec.description}</p>
                  <p className="text-xs italic text-gray-500">
                    Grund: {rec.gapReason} · Basis: {rec.basedOn} · Bereich: {rec.category}
                  </p>
                </header>

                <div className="mt-3 flex flex-col sm:flex-row gap-2">
                  <button
                    onClick={() => createTaskFromRecommendation(rec, false)}
                    disabled={isBusy || !userId}
                    className="w-full sm:w-auto px-3 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700 disabled:opacity-60 text-sm"
                    aria-label={`Empfehlung als DO übernehmen: ${rec.title}`}
                  >
                    {isBusy ? 'Übernehme…' : 'Als DO übernehmen'}
                  </button>
                  <button
                    onClick={() => createTaskFromRecommendation(rec, true)}
                    disabled={isBusy || !userId}
                    className="w-full sm:w-auto px-3 py-2 bg-rose-600 text-white rounded hover:bg-rose-700 disabled:opacity-60 text-sm"
                    aria-label={`Empfehlung als DON'T vormerken: ${rec.title}`}
                  >
                    {isBusy ? 'Merke vor…' : "Als DON’T vormerken"}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
};

export default FrequencyRecommendations;
