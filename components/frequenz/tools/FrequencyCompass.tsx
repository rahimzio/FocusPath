'use client';

import React from 'react';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  ResponsiveContainer,
  Legend,
} from 'recharts';

export interface CompassData {
  mindset: number;
  emotion: number;
  behavior: number;
  body: number;
}

interface Props {
  current: CompassData;
  ideal: CompassData;
}

const clamp01 = (v: number) => Math.max(0, Math.min(100, v));

const FrequencyCompass: React.FC<Props> = ({ current, ideal }) => {
  const data = [
    { cat: 'Mindset', current: clamp01(current.mindset), ideal: clamp01(ideal.mindset) },
    { cat: 'Emotion', current: clamp01(current.emotion), ideal: clamp01(ideal.emotion) },
    { cat: 'Verhalten', current: clamp01(current.behavior), ideal: clamp01(ideal.behavior) },
    { cat: 'Körper', current: clamp01(current.body), ideal: clamp01(ideal.body) },
  ];

  return (
    <section className="bg-white p-4 sm:p-6 rounded-lg shadow">
      <h2 className="text-lg sm:text-2xl font-semibold mb-3 sm:mb-4">Frequency Compass</h2>

      {/* Für ResponsiveContainer braucht der Parent eine feste Höhe */}
      <div className="h-[260px] sm:h-[320px]">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={data}>
            <PolarGrid />
            <PolarAngleAxis dataKey="cat" tick={{ fontSize: 12 }} />
            <Legend verticalAlign="top" height={24} />
            <Radar
              name="Aktuell"
              dataKey="current"
              stroke="#111827"
              fill="#111827"
              fillOpacity={0.35}
            />
            <Radar
              name="Ideal"
              dataKey="ideal"
              stroke="#10b981"
              fill="#10b981"
              fillOpacity={0.25}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      <p className="mt-2 text-[11px] text-gray-600">
        Werte in %. „Aktuell“ nähert sich „Ideal“ über deine täglichen Micro-Beweise.
      </p>
    </section>
  );
};

export default FrequencyCompass;
