"use client";

import useSWR from "swr";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import ReflectionPanel from "./ReflectionPanel";

interface TradeReflectionProps {
  userId: string;
  date?: string;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function TradeReflection({ userId, date }: TradeReflectionProps) {
  const day = date || new Date().toISOString().slice(0, 10);
  const { data } = useSWR(
    userId ? `/api/trading/getByDate?date=${day}&userId=${userId}` : null,
    fetcher
  );
  const trade = data?.trades?.[0];

  if (!trade) return null;

  return (
    <Card className="w-full max-w-full min-w-0 overflow-hidden">
      <CardHeader className="w-full max-w-full min-w-0">
        <CardTitle className="truncate">Trade Reflexion</CardTitle>
      </CardHeader>
      <CardContent className="w-full max-w-full min-w-0">
        {/* verhindert, dass Inhalte horizontal aus der Card ragen */}
        <div className="w-full max-w-full min-w-0 overflow-x-auto">
          {/* sorgt für sauberes Umbrechen innerhalb des Scroll-Containers */}
          <div className="min-w-0 max-w-full break-words">
            <ReflectionPanel trade={trade} onSaved={() => {}} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
