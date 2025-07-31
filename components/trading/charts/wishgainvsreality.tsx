"use client";

import React from "react";
import { TrendingUp } from "lucide-react";
import {
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  Tooltip as RechartsTooltip,
} from "recharts";

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

const chartData = [
  { month: "January", desktop: 186, mobile: 80 },
  { month: "February", desktop: 305, mobile: 200 },
  { month: "March", desktop: 237, mobile: 120 },
  { month: "April", desktop: 73, mobile: 190 },
  { month: "May", desktop: 209, mobile: 130 },
  { month: "June", desktop: 214, mobile: 140 },
];

const chartConfig = {
  desktop: { label: "Desktop", color: "hsl(var(--chart-1))" },
  mobile: { label: "Mobile", color: "hsl(var(--chart-2))" },
} satisfies ChartConfig;

export function Component() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Besucher-Entwicklung (gestapelt)</CardTitle>
        <CardDescription>
          Gesamtbesucher der letzten 6 Monate nach Plattform
        </CardDescription>
      </CardHeader>
      <CardContent>
        <AspectRatio ratio={16 / 9} className="w-full">
          <ChartContainer config={chartConfig}>
            <AreaChart
              data={chartData}
              margin={{ left: 12, right: 12 }}
            >
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="month"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tickFormatter={(value) => value.slice(0, 3)}
              />
              <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="dot" />} />
              <Area
                dataKey="mobile"
                type="natural"
                stackId="a"
                fill="var(--color-mobile)"
                fillOpacity={0.4}
                stroke="var(--color-mobile)"
              />
              <Area
                dataKey="desktop"
                type="natural"
                stackId="a"
                fill="var(--color-desktop)"
                fillOpacity={0.4}
                stroke="var(--color-desktop)"
              />
            </AreaChart>
          </ChartContainer>
        </AspectRatio>
      </CardContent>
      <CardFooter>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-sm">
          <div className="flex items-center gap-2 font-medium">
            Trending um 5,2% diesen Monat <TrendingUp className="h-4 w-4" />
          </div>
          <div className="text-muted-foreground">
            Januar – Juni 2024
          </div>
        </div>
      </CardFooter>
    </Card>
  );
}
