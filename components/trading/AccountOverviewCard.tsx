"use client";
import React from "react";
import { PieChart, Pie, Cell, LineChart, Line, ResponsiveContainer, Tooltip } from "recharts";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Stat, StatLabel, StatNumber } from "../ui/stat";
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
    <Card>
      <CardHeader>
        <CardTitle>Kontoübersicht</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Statistiken: Balance & verfügbare Marge */}
        <div className="grid grid-cols-2 gap-4">
          <Stat>
            <StatLabel>Balance</StatLabel>
            <StatNumber>{balance.toFixed(2)} €</StatNumber>
          </Stat>
          <Stat>
            <StatLabel>Verfügbare Marge</StatLabel>
            <StatNumber>{availableMargin.toFixed(2)} €</StatNumber>
          </Stat>
        </div>

        {/* Equity-Verlauf als Linie, mobil-optimiert */}
        <AspectRatio ratio={4 / 1} className="w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={equityCurve}>
              <Line type="monotone" dataKey="value" stroke="#3b82f6" dot={false} />
              <Tooltip />
            </LineChart>
          </ResponsiveContainer>
        </AspectRatio>

        {/* Marge-Verteilung als Pie-Chart */}
        <AspectRatio ratio={1 / 1} className="w-32 mx-auto">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                dataKey="value"
                innerRadius={20}
                outerRadius={50}
                label
              >
                <Cell fill="#3b82f6" />
                <Cell fill="#e5e7eb" />
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </AspectRatio>
      </CardContent>
    </Card>
  );
}
