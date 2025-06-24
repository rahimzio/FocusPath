import { StatHistoryEntry } from "@/utils/sport/stats";
import React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface Props {
  statKey: string;
  history: StatHistoryEntry[];
  currentValue: number;
}

function getValue(obj: any, path: string): number {
  return path.split(".").reduce((o, p) => (o ? o[p] : 0), obj) as number;
}

const StatHistoryChart = ({ statKey, history, currentValue }: Props) => {
  const data = history.map((h) => ({
    date: h.date.toISOString().split("T")[0],
    value: getValue(h.snapshot, statKey) ?? 0,
  }));

  data.push({ date: "Jetzt", value: currentValue });

  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={data}>
        <XAxis dataKey="date" />
        <YAxis domain={[0, 110]} />
        <Tooltip />
        <Line type="monotone" dataKey="value" stroke="#3b82f6" />
      </LineChart>
    </ResponsiveContainer>
  );
};

export default StatHistoryChart;