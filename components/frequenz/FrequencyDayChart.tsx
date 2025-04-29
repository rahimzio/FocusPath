// components/FrequencyDayChart.tsx
import React, { useState } from "react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  TooltipProps,
  Cell,
} from "recharts";

// Frequenz-Snapshot
interface FrequencySnapshot {
  date: string; // YYYY-MM-DD
  morningFrequency: number;
  eveningFrequency: number;
}

interface FrequencyDayChartProps {
  snapshots: FrequencySnapshot[];
}

// Farblogik je nach Frequenz
function getColorByFrequency(score: number): string {
  if (score <= 39) return "#f87171"; // Rot
  if (score <= 69) return "#facc15"; // Gelb
  if (score <= 89) return "#34d399"; // Grün
  return "#fef08a"; // Weiß-Gold
}

// Textbeschreibung je Frequenz
function getFrequencyLevel(score: number): string {
  if (score <= 39) return "Niedrig (Rot)";
  if (score <= 69) return "Neutral (Gelb)";
  if (score <= 89) return "Hoch (Grün)";
  return "Transzendent (Weiß-Gold)";
}

// Eigene Tooltip-Komponente
const CustomTooltip = ({ active, payload, label }: TooltipProps<any, any>) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-4 rounded shadow-md border text-sm text-gray-700">
        <p className="font-semibold mb-2">{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index}>
            {entry.name}: {entry.value} → {getFrequencyLevel(entry.value)}
          </div>
        ))}
      </div>
    );
  }
  return null;
};

// Eigene Dot-Komponente für LineChart
const CustomDot = ({ cx, cy, payload, dataKey }: any) => {
  if (cx === undefined || cy === undefined) return null;
  const frequency = payload[dataKey];
  const color = getColorByFrequency(frequency);

  return (
    <circle
      cx={cx}
      cy={cy}
      r={4}
      stroke={color}
      strokeWidth={3}
      fill="white"
    />
  );
};

const FrequencyDayChart: React.FC<FrequencyDayChartProps> = ({ snapshots }) => {
  const [chartType, setChartType] = useState<"line" | "bar">("line");

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-semibold text-gray-800">Frequenzverlauf der letzten 7 Tage</h2>
        <select
          value={chartType}
          onChange={(e) => setChartType(e.target.value as "line" | "bar")}
          className="p-2 border rounded"
        >
          <option value="line">Kurve</option>
          <option value="bar">Balkendiagramm</option>
        </select>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        {chartType === "line" ? (
          <LineChart data={snapshots}>
            <XAxis dataKey="date" />
            <YAxis domain={[0, 100]} />
            <Tooltip content={<CustomTooltip />} />
            <CartesianGrid stroke="#eee" strokeDasharray="5 5" />
            <Line
              type="monotone"
              dataKey="morningFrequency"
              stroke="#34d399"
              name="Morgens"
              dot={<CustomDot dataKey="morningFrequency" />}
            />
            <Line
              type="monotone"
              dataKey="eveningFrequency"
              stroke="#60a5fa"
              name="Abends"
              dot={<CustomDot dataKey="eveningFrequency" />}
            />
          </LineChart>
        ) : (
          <BarChart data={snapshots}>
            <XAxis dataKey="date" />
            <YAxis domain={[0, 100]} />
            <Tooltip content={<CustomTooltip />} />
            <CartesianGrid stroke="#eee" strokeDasharray="5 5" />
            <Bar dataKey="morningFrequency" name="Morgens">
              {snapshots.map((entry, index) => (
                <Cell key={`morning-${index}`} fill={getColorByFrequency(entry.morningFrequency)} />
              ))}
            </Bar>
            <Bar dataKey="eveningFrequency" name="Abends">
              {snapshots.map((entry, index) => (
                <Cell key={`evening-${index}`} fill={getColorByFrequency(entry.eveningFrequency)} />
              ))}
            </Bar>
          </BarChart>
        )}
      </ResponsiveContainer>

      {/* Farblegende */}
      <div className="flex gap-4 mt-6 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-red-400"></div> <span>0–39: Niedrig</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-yellow-400"></div> <span>40–69: Neutral</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-green-400"></div> <span>70–89: Hoch</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-yellow-100"></div> <span>90–100: Transzendent</span>
        </div>
      </div>
    </div>
  );
};

export default FrequencyDayChart;
