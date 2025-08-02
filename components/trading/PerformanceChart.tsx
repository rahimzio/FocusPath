"use client";
import useSWR from "swr";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface PerformanceChartProps {
  userId: string;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function PerformanceChart({ userId }: PerformanceChartProps) {
  const { data } = useSWR(
    userId ? `/api/trades/monthlyPnl?userId=${userId}` : null,
    fetcher
  );

  if (!data) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Performance</CardTitle>
      </CardHeader>
      <CardContent>
        <AspectRatio ratio={16 / 9}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="cumPnl" stroke="#3b82f6" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </AspectRatio>
      </CardContent>
    </Card>
  );
}
