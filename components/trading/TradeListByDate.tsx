"use client";

import React from "react";
import useSWR from "swr";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

type Result = "win" | "loss" | "BE";

type Trade = {
  _id: string;
  date: string;            // YYYY-MM-DD
  symbol: string;
  result: Result;
  pnl: number;
  startTime?: string;      // "HH:MM"
  endTime?: string;        // "HH:MM"
  durationMin?: number;
  session?: "Asia" | "London" | "NewYork" | "Overlap" | string;
  accountId?: string;
  strategy_name?: string;
};

const fetcher = (url: string) => fetch(url).then((r) => r.json());

// Loss → outline + rote Styles (Badge kennt kein "destructive")
function resultBadgeProps(result: Result) {
  switch (result) {
    case "win":  return { variant: "default" as const,   className: undefined };
    case "BE":   return { variant: "secondary" as const, className: undefined };
    case "loss":
    default:     return { variant: "outline" as const,   className: "border-rose-500 text-rose-600" };
  }
}

export default function TradeListByDate({ userId, date }: { userId: string; date: string }) {
  // 👉 Account/Strategy aus URL lesen + auf Events reagieren
  const [accountId, setAccountId] = React.useState<string | undefined>();
  const [strategy, setStrategy]   = React.useState<string | undefined>();

  React.useEffect(() => {
    const url = new URL(window.location.href);
    setAccountId(url.searchParams.get("account") || undefined);
    setStrategy(url.searchParams.get("strategy") || undefined);

    const onAccount = (e: any) => setAccountId(e?.detail?.accountId || undefined);
    const onStrategy = (e: any) => setStrategy(e?.detail?.name || undefined);

    window.addEventListener("account-change", onAccount as EventListener);
    window.addEventListener("strategy-select", onStrategy as EventListener);
    return () => {
      window.removeEventListener("account-change", onAccount as EventListener);
      window.removeEventListener("strategy-select", onStrategy as EventListener);
    };
  }, []);

  // 👉 SWR-Key inkl. Filter
  const key = React.useMemo(() => {
    if (!userId || !date) return null;
    const qs = [
      `date=${encodeURIComponent(date)}`,
      `userId=${encodeURIComponent(userId)}`,
      accountId ? `accountId=${encodeURIComponent(accountId)}` : null,
      strategy ? `strategy=${encodeURIComponent(strategy)}` : null,
    ].filter(Boolean).join("&");
    return `/api/trading/getByDate?${qs}`;
  }, [userId, date, accountId, strategy]);

  const { data, error, isLoading } = useSWR<{ trades: Trade[] }>(key, fetcher);

  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <CardTitle>Trades am {date}</CardTitle>
      </CardHeader>
      <CardContent>
        {error && <div className="text-red-600">Fehler beim Laden.</div>}
        {isLoading && <div className="opacity-70">Lade…</div>}
        {!isLoading && (!data?.trades || data.trades.length === 0) && (
          <div className="opacity-70">Keine Trades für dieses Datum.</div>
        )}

        {!!data?.trades?.length && (
          <div className="space-y-4 max-h-[420px] overflow-y-auto pr-2">
            {data.trades.map((t) => {
              const duration = t.durationMin ?? 0;
              const { variant, className } = resultBadgeProps(t.result);
              return (
                <div key={t._id} className="rounded-lg border p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    {/* links */}
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge>{t.symbol}</Badge>

                      <Badge variant="secondary">
                        {t.startTime ?? "??:??"}–{t.endTime ?? "??:??"}
                        {duration ? ` (${duration} Min)` : ""}
                      </Badge>

                      {t.session ? <Badge variant="outline">{t.session}</Badge> : null}
                      {t.accountId ? <Badge variant="outline">Acc: {t.accountId.slice(-6)}</Badge> : null}
                      {t.strategy_name ? <Badge variant="outline">{t.strategy_name}</Badge> : null}

                      <Badge variant={variant} className={className}>
                        {t.result.toUpperCase()} • {Number.isFinite(t.pnl) ? t.pnl : 0}
                      </Badge>
                    </div>

                    {/* rechts */}
                    <div className="text-sm opacity-70">{t.date}</div>
                  </div>

                  <Separator className="my-3" />

                  <div className="text-sm opacity-70">
                    Recap verfügbar in der Trade-Detailansicht.
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
