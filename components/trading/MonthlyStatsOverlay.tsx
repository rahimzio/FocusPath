"use client";
import { useState } from "react";
import useSWR from "swr";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, ResponsiveContainer } from "recharts";

interface Props {
  userId: string;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function MonthlyStatsOverlay({ userId }: Props) {
  const [open, setOpen] = useState(false);
  const { data } = useSWR(open ? `/api/stats/monthly/${userId}` : null, fetcher);

  return (
    <div>
      <button onClick={() => setOpen(true)} className="px-3 py-1 bg-blue-600 text-white rounded">
        Letzte Monate Stats
      </button>
      {open && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-4 w-full max-w-xl">
            <button className="mb-2" onClick={() => setOpen(false)}>Schließen</button>
            {data ? (
              <div className="space-y-4">
                <div className="h-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.months}>
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Bar dataKey="pnl" fill="#8884d8" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="h-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data.months}>
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Line type="monotone" dataKey="cumulative" stroke="#82ca9d" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div className="text-sm">
                  Max Drawdown: {data.maxDrawdown.toFixed(2)} | Avg. RR: {data.avgRiskReward.toFixed(2)}
                </div>
              </div>
            ) : (
              <div>Daten laden...</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}