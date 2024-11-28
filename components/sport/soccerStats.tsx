"use client";
import { TrendingUp } from "lucide-react";
import { PolarAngleAxis, PolarGrid, Radar, RadarChart } from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { useState } from "react";

// Beispielhafte Daten (z.B. für Kick, Physical, Technique)
const chartData = [
  { stat: "Kick", value: 88 },
  { stat: "Physical", value: 85 },
  { stat: "Technique", value: 90 },
];

const chartConfig = {
  desktop: {
    label: "Stat",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig;

const SoccerStats = ({ name, stats }: { name: string; stats: any }) => {
  const { kick, physical, technique, totalScore, grade } = stats;

  return (
    <div className="flex flex-col items-center p-4 bg-gray-800 rounded-lg shadow-md">
      {/* Profilbereich */}
      <div className="flex flex-col items-center text-center">
        <img
          src="https://via.placeholder.com/100" // Hier kannst du das Spielerbild hinzufügen
          alt={name}
          className="w-24 h-24 rounded-full mb-4"
        />
        <h2 className="text-xl font-semibold text-white">{name}</h2>
        <p className="text-md text-white mb-2">Average Score: {totalScore}</p>
        <p className="text-md text-white mb-4">Grade: {grade}</p>
      </div>

      {/* Radar Chart für die wichtigsten Stats */}
      <Card>
        <CardHeader className="items-center pb-4">
          <CardTitle>Player Stats</CardTitle>
          <CardDescription>Overview of main stats</CardDescription>
        </CardHeader>
        <CardContent className="pb-0">
          <ChartContainer
            config={chartConfig}
            className="mx-auto aspect-square max-h-[250px]"
          >
            <RadarChart data={chartData}>
              <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
              <PolarAngleAxis dataKey="stat" />
              <PolarGrid />
              <Radar
                dataKey="value"
                fill="var(--color-desktop)"
                fillOpacity={0.6}
              />
            </RadarChart>
          </ChartContainer>
        </CardContent>
        <CardFooter className="flex-col gap-2 text-sm">
          <div className="flex items-center gap-2 font-medium leading-none">
            Trending up by 5.2% this month <TrendingUp className="h-4 w-4" />
          </div>
          <div className="flex items-center gap-2 leading-none text-muted-foreground">
            January - June 2024
          </div>
        </CardFooter>
      </Card>

      {/* Kategorisierte Statistiken */}
      <div className="mt-6 w-full text-white">
        {/* Kick */}
        <div className="mb-4">
          <h3 className="text-lg font-semibold mb-2">Kick Stats</h3>
          <ul>
            {kick.map((stat: string, index: number) => (
              <li key={index} className="flex justify-between">
                <span>{stat}</span>
                <span>{Math.floor(Math.random() * 100)}</span>{" "}
                {/* Beispielwerte */}
              </li>
            ))}
          </ul>
        </div>

        {/* Physical */}
        <div className="mb-4">
          <h3 className="text-lg font-semibold mb-2">Physical Stats</h3>
          <ul>
            {physical.map((stat: string, index: number) => (
              <li key={index} className="flex justify-between">
                <span>{stat}</span>
                <span>{Math.floor(Math.random() * 100)}</span>{" "}
                {/* Beispielwerte */}
              </li>
            ))}
          </ul>
        </div>

        {/* Technique */}
        <div className="mb-4">
          <h3 className="text-lg font-semibold mb-2">Technique Stats</h3>
          <ul>
            {technique.map((stat: string, index: number) => (
              <li key={index} className="flex justify-between">
                <span>{stat}</span>
                <span>{Math.floor(Math.random() * 100)}</span>{" "}
                {/* Beispielwerte */}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default SoccerStats;
