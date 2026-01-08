"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { TradingSetup } from "../interface";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface SetupCardProps {
  setup: TradingSetup;
  onEdit: (setup: TradingSetup) => void;
  onOpenDetail?: (setup: TradingSetup) => void;
  compact?: boolean;
    userId?: string;
}

/* -----------------------------
   Visual Mappings
----------------------------- */

const statusVariantMap: Record<
  string,
  "default" | "secondary" | "outline"
> = {
  open: "secondary",
  triggered: "default",
  entered: "default",
  completed: "outline",
  missed: "outline",
  invalidated: "outline",
};

const directionColorMap: Record<string, string> = {
  long: "text-emerald-500",
  short: "text-red-500",
};

const gameGradeStyleMap: Record<
  string,
  { label: string; className: string }
> = {
  A: {
    label: "A-Game",
    className: "border-emerald-500 text-emerald-600",
  },
  B: {
    label: "B-Game",
    className: "border-amber-500 text-amber-600",
  },
  C: {
    label: "C-Game",
    className: "border-red-500 text-red-600",
  },
};

/* -----------------------------
   Component
----------------------------- */

const SetupCard: React.FC<SetupCardProps> = ({
  setup,
  onEdit,
  onOpenDetail,
  compact,
}) => {
  const statusVariant =
    statusVariantMap[setup.status] ?? "outline";

  const created = setup.createdAt
    ? new Date(setup.createdAt as string).toLocaleDateString()
    : undefined;

  const gameGradeConfig = setup.gameGrade
    ? gameGradeStyleMap[setup.gameGrade]
    : undefined;

  return (
    <Card
      className={cn(
        "flex flex-col justify-between cursor-pointer hover:bg-muted/50 transition",
        compact && "opacity-80"
      )}
      onClick={() => onOpenDetail?.(setup)}
    >
      {/* Chart Preview */}
      {setup.chartImageUrl && (
        <div className="relative h-24 w-full overflow-hidden rounded-t-xl border-b bg-black/10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={setup.chartImageUrl}
            alt={setup.setupLabel ?? setup.market}
            className="h-full w-full object-cover"
          />
        </div>
      )}

      <CardHeader className="space-y-1">
        {/* Title + Status */}
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm font-semibold leading-tight line-clamp-1">
            {setup.setupLabel ?? "Unbenanntes Setup"}
          </CardTitle>
          <Badge
            variant={statusVariant}
            className="text-[10px] uppercase"
          >
            {setup.status}
          </Badge>
        </div>

        {/* Market / Direction / TFs */}
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span>{setup.market}</span>
          {setup.direction && (
            <span
              className={cn(
                "font-medium",
                directionColorMap[setup.direction] ?? ""
              )}
            >
              {setup.direction.toUpperCase()}
            </span>
          )}
          {setup.htfTf && <span>HTF: {setup.htfTf}</span>}
          {setup.entryTf && <span>Entry: {setup.entryTf}</span>}
        </div>

        {setup.patternType && (
          <p className="text-xs text-muted-foreground">
            {setup.patternType}
          </p>
        )}
      </CardHeader>

      <CardContent className="flex flex-col gap-2 pb-4">
        {/* Thought Process */}
        {setup.thoughtProcess && !compact && (
          <p className="line-clamp-3 text-xs text-muted-foreground">
            {setup.thoughtProcess}
          </p>
        )}

        {/* Meta Badges */}
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground">
          <div className="flex flex-wrap items-center gap-2">
            {gameGradeConfig && (
              <Badge
                variant="outline"
                className={cn(
                  "text-[10px] font-semibold",
                  gameGradeConfig.className
                )}
              >
                {gameGradeConfig.label}
              </Badge>
            )}

            {setup.outcome && (
              <Badge variant="outline" className="text-[10px]">
                Outcome: {setup.outcome}
              </Badge>
            )}

            {setup.decision && (
              <Badge variant="outline" className="text-[10px]">
                Decision: {setup.decision}
              </Badge>
            )}
          </div>

          {created && <span>erstellt: {created}</span>}
        </div>

        {/* Actions */}
        <div className="mt-3 flex justify-end">
          <Button
            size="sm"
            variant="outline"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(setup);
            }}
          >
            Bearbeiten
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default SetupCard;
