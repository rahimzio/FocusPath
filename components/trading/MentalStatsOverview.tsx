"use client";
import useSWR from "swr";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer } from "recharts";

interface Props {
  userId: string;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function MentalStatsOverview({ userId }: Props) {
  const { data } = useSWR(userId ? `/api/trades/mentalStats?userId=${userId}` : null, fetcher);

  if (!data) return <div>Mentaldaten laden...</div>;

  const perfData = [
    { name: "A", value: data.performance.A || 0 },
    { name: "B", value: data.performance.B || 0 },
    { name: "C", value: data.performance.C || 0 },
  ];

  return (
    <div className="space-y-2 p-2 bg-white rounded shadow">
      <div className="h-40">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={perfData}>
            <XAxis dataKey="name" />
            <YAxis allowDecimals={false} />
            <Bar dataKey="value" fill="#8884d8" />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="text-sm">Ø Disziplin: {Math.round(data.avgDiscipline)}</div>
      <div className="text-sm">Tilt Events: {data.tiltCount}</div>
      <ul className="text-sm list-disc pl-4">
        {data.mistakes.map((m: any) => (
          <li key={m.name}>{m.name}: {m.count}</li>
        ))}
      </ul>
    </div>
  );
}