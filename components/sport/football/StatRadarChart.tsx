import { FootballStatProfile } from "@/utils/sport/stats";
import React from "react";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface Props {
  current: FootballStatProfile;
  compareTo?: Partial<FootballStatProfile>;
}

const categories = [
  { key: "speed.sprint.level", label: "Sprint" },
  { key: "speed.topSpeed.level", label: "TopSpeed" },
  { key: "speed.agility.level", label: "Agility" },
  { key: "endurance.cooper.level", label: "Cooper" },
  { key: "endurance.beepTest.level", label: "Beep" },
];

function getValue(obj: any, path: string): number {
  return path.split(".").reduce((o, p) => (o ? o[p] : 0), obj) as number;
}

const StatRadarChart = ({ current, compareTo }: Props) => {
  const data = categories.map((c) => ({
    stat: c.label,
    current: getValue(current, c.key) ?? 0,
    compare: compareTo ? getValue(compareTo, c.key) ?? 0 : undefined,
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <RadarChart data={data}>
        <PolarGrid />
        <PolarAngleAxis dataKey="stat" />
        <Radar
          name="Aktuell"
          dataKey="current"
          stroke="#ef4444"
          fill="#ef4444"
          fillOpacity={0.6}
        />
        {compareTo && (
          <Radar
            name="Vergleich"
            dataKey="compare"
            stroke="#3b82f6"
            fill="#3b82f6"
            fillOpacity={0.3}
          />
        )}
        <Legend />
      </RadarChart>
    </ResponsiveContainer>
  );
};

export default StatRadarChart;