// components/trading/setup/RecentSetupsPanel.tsx
import * as React from "react";
import useSWR from "swr";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TradingSetup } from "../interface";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface RecentSetupsPanelProps {
  userId: string;
  marketFilter?: string; // optional: nur NAS100, nur Gold etc.
  limit?: number;
  onSelectSetup?: (setup: TradingSetup) => void;
}

export const RecentSetupsPanel: React.FC<RecentSetupsPanelProps> = ({
  userId,
  marketFilter,
  limit = 8,
  onSelectSetup,
}) => {
  const { data, error, isLoading } = useSWR(
    userId ? `/api/trading/setups/list?userId=${userId}` : null,
    fetcher
  );

  let setups: TradingSetup[] = data?.setups ?? [];

  if (marketFilter) {
    setups = setups.filter(
      (s) => s.market?.toLowerCase() === marketFilter.toLowerCase()
    );
  }

  setups = setups.sort((a, b) => {
    const ad = a.updatedAt || a.createdAt || "";
    const bd = b.updatedAt || b.createdAt || "";
    return bd.localeCompare(ad);
  });

  setups = setups.slice(0, limit);

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold">
          Letzte Setups
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-10 rounded-md" />
            ))}
          </div>
        ) : error ? (
          <p className="text-xs text-destructive">
            Fehler beim Laden der Setups.
          </p>
        ) : setups.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            Noch keine Setups erfasst.
          </p>
        ) : (
          <ScrollArea className="max-h-80 pr-2">
            <div className="space-y-2">
              {setups.map((s) => (
                <button
                  key={s._id}
                  type="button"
                  onClick={() => onSelectSetup?.(s)}
                  className="w-full rounded-md border bg-background/50 p-2 text-left text-xs transition hover:bg-accent"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium line-clamp-1">
                      {s.setupLabel}
                    </span>
                    <Badge variant="outline" className="text-[10px]">
                      {s.status}
                    </Badge>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-1 text-[11px] text-muted-foreground">
                    <span>{s.market}</span>
                    <span>· {s.direction === "long" ? "Long" : "Short"}</span>
                    {s.gameGrade && (
                      <span>· Game {s.gameGrade}</span>
                    )}
                    {s.outcome && <span>· {s.outcome}</span>}
                  </div>
                </button>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};
