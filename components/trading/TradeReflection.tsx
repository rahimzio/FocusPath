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
    userId ? `/api/trades/getByDate?date=${day}&userId=${userId}` : null,
    fetcher
  );
  const trade = data?.trades?.[0];

  if (!trade) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Trade Reflexion</CardTitle>
      </CardHeader>
      <CardContent>
        <ReflectionPanel trade={trade} onSaved={() => {}} />
      </CardContent>
    </Card>
  );
}