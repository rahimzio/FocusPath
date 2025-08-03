"use client";
import useSWR from "swr";
import { TradeEntry } from "@/utils/interface";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import {
  BarChart,
  Bar,
  XAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface Props {
  date: string;
  userId: string;
}

export default function TradeListByDate({ date, userId }: Props) {
  const { data } = useSWR<{ trades: TradeEntry[] }>(
    date ? `/api/trading/getByDate?date=${date}&userId=${userId}` : null,
    fetcher
  );
  const trades: TradeEntry[] = data?.trades || [];

  if (!trades.length) {
    return <div className="text-center py-8">Keine Trades an diesem Tag.</div>;
  }

  return (
    <div className="space-y-4">
      {trades.map((trade) => (
        <Card key={trade._id}>
          <CardHeader className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base">
                {trade.symbol} – {trade.setup}
              </CardTitle>
              {trade.tiltDetected && (
                <span className="text-red-500" title="Tilt erkannt">⚠</span>
              )}
            </div>
            <CardDescription>{trade.pnl.toFixed(2)} €</CardDescription>
          </CardHeader>

          <CardContent className="pt-0 text-sm text-muted-foreground">
            Rating: {trade.rating}
          </CardContent>

          <CardFooter>
            <AspectRatio ratio={4 / 1} className="w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={[
                    { label: "Entry", value: trade.entry },
                    { label: "Exit", value: trade.exit },
                  ]}
                >
                  <XAxis dataKey="label" />
                  <Tooltip />
                  <Bar dataKey="value" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </AspectRatio>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}
