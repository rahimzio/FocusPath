"use client";
import useSWR from "swr";
import { TradeEntry } from "@/utils/interface";

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
      {trades.map(trade => (
        <div key={trade._id} className="border p-2 rounded bg-white shadow">
          <div className="flex justify-between">
            <span>{trade.symbol} - {trade.setup}</span>
            <span>{trade.pnl}</span>
          </div>
          <div className="text-sm text-gray-500">Rating: {trade.rating}</div>
        </div>
      ))}
    </div>
  );
}