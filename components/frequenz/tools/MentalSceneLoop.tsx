'use client';

import { MentalScene } from '@/utils/interfaces/frequency';
import React, { useEffect, useRef, useState } from 'react';

interface Props {
  onComplete?: () => void;
}

const emptyScene: MentalScene = {
  description: '',
  person: '',
  comment: '',
  associatedEmotion: '',
  createdAt: new Date(),
};

const clampInt = (n: number, min: number, max: number) =>
  Math.max(min, Math.min(max, Math.round(n)));

const MentalSceneLoop: React.FC<Props> = ({ onComplete }) => {
  const [scene, setScene] = useState<MentalScene>(emptyScene);
  const [repeat, setRepeat] = useState(3);
  const [isPlaying, setIsPlaying] = useState(false);
  const [step, setStep] = useState(0);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    return () => {
      // cleanup on unmount
      timers.current.forEach((t) => window.clearTimeout(t));
      timers.current = [];
    };
  }, []);

  const handlePlay = () => {
    if (isPlaying) return;
    const total = clampInt(repeat, 1, 20);
    setStep(0);
    setIsPlaying(true);
    timers.current = [];

    const playOne = (i: number) => {
      setStep(i + 1);
    };

    for (let i = 0; i < total; i++) {
      const id = window.setTimeout(() => {
        playOne(i);
        if (i === total - 1) {
          setIsPlaying(false);
          onComplete?.();
        }
      }, i * 700); // sanftes Tempo
      timers.current.push(id);
    }
  };

  const handleStop = () => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
    setIsPlaying(false);
    setStep(0);
  };

  const progressPct = repeat ? Math.min(100, Math.round((step / repeat) * 100)) : 0;

  return (
    <section className="bg-white p-4 sm:p-6 rounded-lg shadow space-y-4">
      <h2 className="text-lg sm:text-2xl font-semibold">Mental Scene Loop</h2>

      <input
        type="text"
        className="w-full border px-3 py-2 rounded"
        placeholder="Beschreibung der Szene"
        value={scene.description}
        onChange={(e) => setScene({ ...scene, description: e.target.value })}
        aria-label="Beschreibung der Szene"
      />
      <input
        type="text"
        className="w-full border px-3 py-2 rounded"
        placeholder="Person"
        value={scene.person}
        onChange={(e) => setScene({ ...scene, person: e.target.value })}
        aria-label="Person"
      />
      <input
        type="text"
        className="w-full border px-3 py-2 rounded"
        placeholder="Kommentar"
        value={scene.comment}
        onChange={(e) => setScene({ ...scene, comment: e.target.value })}
        aria-label="Kommentar"
      />
      <input
        type="text"
        className="w-full border px-3 py-2 rounded"
        placeholder="Gefühl"
        value={scene.associatedEmotion}
        onChange={(e) => setScene({ ...scene, associatedEmotion: e.target.value })}
        aria-label="Gefühl"
      />

      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
        <label className="text-sm">Wiederholungen:</label>
        <input
          type="number"
          min={1}
          max={20}
          value={repeat}
          onChange={(e) => setRepeat(clampInt(Number(e.target.value || 1), 1, 20))}
          className="w-24 border px-2 py-1 rounded"
          aria-label="Anzahl der Wiederholungen"
        />
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-2">
        <button
          onClick={handlePlay}
          disabled={isPlaying}
          className="w-full sm:w-auto bg-green-600 text-white px-4 py-2 rounded disabled:opacity-60"
        >
          {isPlaying ? 'Läuft…' : 'Start'}
        </button>
        <button
          onClick={handleStop}
          disabled={!isPlaying && step === 0}
          className="w-full sm:w-auto bg-gray-200 text-gray-900 px-4 py-2 rounded disabled:opacity-50"
        >
          Stop
        </button>
      </div>

      {/* Progress */}
      <div className="space-y-1">
        <div className="text-sm text-gray-700">
          Fortschritt: {step}/{repeat}
        </div>
        <div className="h-2 w-full bg-gray-100 rounded overflow-hidden">
          <div
            className="h-2 bg-green-600"
            style={{ width: `${progressPct}%`, transition: 'width 200ms linear' }}
            aria-label="Fortschrittsbalken"
          />
        </div>
      </div>
    </section>
  );
};

export default MentalSceneLoop;
