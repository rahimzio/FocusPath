"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { TradeEntry } from "../interface";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface TradeRowCardProps {
  trade: TradeEntry;
  onEdit: (trade: TradeEntry) => void;
}

const tradeResultColorMap: Record<"win" | "loss" | "BE", string> = {
  win: "text-emerald-500",
  loss: "text-red-500",
  BE: "text-slate-500",
};

const TradeRowCard: React.FC<TradeRowCardProps> = ({ trade, onEdit }) => {
  return (
    <Card className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-1">
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">{trade.symbol}</span>
          <span>{trade.date}</span>
          <span
            className={cn(
              "font-semibold",
              tradeResultColorMap[trade.result]
            )}
          >
            {trade.result.toUpperCase()}
          </span>
          <span>{trade.pnl.toFixed(2)} PnL</span>
          {typeof trade.rMultiple === "number" && (
            <span>R: {trade.rMultiple.toFixed(2)}</span>
          )}
        </div>

        {trade.setup && (
          <p className="text-[11px] text-muted-foreground">
            Setup: {trade.setup}
          </p>
        )}
        {trade.groupName && (
          <p className="text-[11px] text-muted-foreground">
            Gruppe: {trade.groupName}
          </p>
        )}
        {trade.gameGrade && (
          <p className="text-[11px] text-muted-foreground">
            Game: {trade.gameGrade}
          </p>
        )}
      </div>

      <div className="flex items-center gap-2 justify-end">
        {trade.rating && (
          <Badge variant="outline" className="text-[10px]">
            Rating {trade.rating}/10
          </Badge>
        )}
        <Button size="sm" variant="outline" onClick={() => onEdit(trade)}>
          Bearbeiten
        </Button>
      </div>
    </Card>
  );
};

export default TradeRowCard;
