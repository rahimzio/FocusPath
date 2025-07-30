"use client";
import { PieChart, Pie, Cell, LineChart, Line, ResponsiveContainer } from "recharts";

export interface EquityPoint {
  date: string;
  value: number;
}

interface Props {
  balance: number;
  equityCurve: EquityPoint[];
  usedMargin: number;
  availableMargin: number;
}

export default function AccountOverviewCard({ balance, equityCurve, usedMargin, availableMargin }: Props) {
  const pieData = [
    { name: "Used", value: usedMargin },
    { name: "Free", value: availableMargin },
  ];
  return (
    <div className="p-4 bg-white rounded shadow space-y-2">
      <div className="text-lg font-semibold">Balance: {balance.toFixed(2)}</div>
      <div className="h-20">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={equityCurve}>
            <Line type="monotone" dataKey="value" stroke="#8884d8" dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="h-24 w-full flex justify-center">
        <ResponsiveContainer width="50%" height="100%">
          <PieChart>
            <Pie data={pieData} dataKey="value" innerRadius={30} outerRadius={40}>
              <Cell fill="#2563eb" />
              <Cell fill="#d1d5db" />
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}