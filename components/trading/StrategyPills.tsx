"use client";
import React from "react";
import useSWR from "swr";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Spinner } from "../ui/spinner";

interface Strategy {
  _id: string;
  name: string;
  tag_color?: string;
}

interface Props {
  userId: string;
  onSelect?: (id: string) => void;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function StrategyPills({ userId, onSelect }: Props) {
  const { data, error, isLoading } = useSWR<{ strategies: Strategy[] }>(
    userId ? `/api/trading/strategies?userId=${userId}` : null,
    fetcher
  );

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Spinner />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="text-center text-red-600 py-4">
        Strategien konnten nicht geladen werden.
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Strategien</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2 flex-wrap">
          {data.strategies.map((s) => (
            <Button
              key={s._id}
              size="sm"
              variant="outline"
              style={{ backgroundColor: s.tag_color ?? undefined }}
              onClick={() => onSelect && onSelect(s._id)}
            >
              {s.name}
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
