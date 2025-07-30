"use client";
import useSWR from "swr";
import { TradeEntry } from "@/utils/interface";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
const fetcher = (url: string) => fetch(url).then(res => res.json());

interface Props {
  date: string;
  userId: string;
}

export default function TradeListByDate({ date, userId }: Props) {
  const { data, mutate } = useSWR(date ? `/api/trades/getByDate?date=${date}&userId=${userId}` : null, fetcher);
  const trades: TradeEntry[] = data?.trades || [];

  return (
    <div className="space-y-2">
      {trades.map((trade) => (
        <Card key={trade._id}>
          <CardHeader className="flex flex-row items-center justify-between py-2">
            <CardTitle className="text-base">
              {trade.symbol} - {trade.setup}
            </CardTitle>
            {trade.tiltDetected && <span className="ml-2 text-red-500">⚠ Tilt</span>}

            <CardDescription>{trade.pnl}</CardDescription>
          </CardHeader>
          <CardContent className="pt-0 text-sm text-muted-foreground">
            Rating: {trade.rating}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}