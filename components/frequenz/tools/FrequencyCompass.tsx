import React from "react";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  ResponsiveContainer,
} from "recharts";

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

const FrequencyCompass: React.FC<Props> = ({ current, ideal }) => {
  const data = [
    { cat: "Mindset", current: current.mindset, ideal: ideal.mindset },
    { cat: "Emotion", current: current.emotion, ideal: ideal.emotion },
    { cat: "Verhalten", current: current.behavior, ideal: ideal.behavior },
    { cat: "Körper", current: current.body, ideal: ideal.body },
  ];

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h2 className="text-2xl font-semibold mb-4">Frequency Compass</h2>
      <ResponsiveContainer width="100%" height={300}>
        <RadarChart data={data}>
          <PolarGrid />
          <PolarAngleAxis dataKey="cat" />
          <Radar
            name="Aktuell"
            dataKey="current"
            stroke="#3b82f6"
            fill="#3b82f6"
            fillOpacity={0.6}
          />
          <Radar
            name="Ideal"
            dataKey="ideal"
            stroke="#10b981"
            fill="#10b981"
            fillOpacity={0.3}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default FrequencyCompass;