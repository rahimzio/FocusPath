"use client";
import useSWR from "swr";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

interface Props {
  userId: string;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const COLORS = ["#8884d8", "#82ca9d", "#ffc658", "#ff8042", "#8dd1e1"];

export default function MistakePatternChart({ userId }: Props) {
  const { data } = useSWR(userId ? `/api/mistakes/${userId}` : null, fetcher);

  if (!data) return <div>Stats aktuell nicht verfügbar</div>;
  const chartData = data.mistakes.map((m: any) => ({ name: m.mistake_type, value: m.count }));

  return (
    <div className="p-4 bg-white rounded shadow space-y-2">
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={chartData} dataKey="value" nameKey="name" outerRadius={70}>
              {chartData.map((_: unknown, i: number) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="space-y-1 text-xs">
        <div>Verwende immer Stop-Loss</div>
        <div>Setze Exit-Targets</div>
      </div>
    </div>
  );
}