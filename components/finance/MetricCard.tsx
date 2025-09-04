"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";
import * as React from "react";

type ValueFormat = "number" | "currency" | "percent";

interface MetricCardProps {
  title: string;
  /** Zahl oder bereits formatierter String (z. B. "23,1") */
  value: number | string;
  /** Optional, wenn du selbst formatierst (z. B. "%", "€"). */
  unit?: string;
  /** Optionaler Trend (z. B. 0.12 = +12%). */
  trend?: number | null;
  /** Tooltip-Text. */
  tooltip?: string;
  /** Wenn true, zeigt Skeleton. */
  isLoading?: boolean;
  /** Automatische Formatierung (überschreibt unit-Ausgabe, außer value ist String). */
  format?: ValueFormat;
  /** Locale für Intl-Formatierung. */
  locale?: string; // z. B. "de-DE"
  /** Dezimalstellen bei number/percent (currency nimmt Währungs-Standard). */
  decimals?: number;
  /** CSS-Klasse für das Card-Root. */
  className?: string;
  /** Währungscode, wenn format="currency" (default EUR). */
  currency?: string;
}

function formatValue(
  value: number | string,
  {
    format,
    locale = "de-DE",
    currency = "EUR",
    decimals,
  }: { format?: ValueFormat; locale?: string; currency?: string; decimals?: number }
) {
  if (typeof value === "string") return value; // bereits formatiert
  if (typeof value !== "number" || !Number.isFinite(value)) return "—";

  switch (format) {
    case "currency":
      return new Intl.NumberFormat(locale, {
        style: "currency",
        currency,
      }).format(value);
    case "percent":
      return new Intl.NumberFormat(locale, {
        style: "percent",
        minimumFractionDigits: decimals ?? 1,
        maximumFractionDigits: decimals ?? 1,
      }).format(value);
    case "number":
    default:
      return new Intl.NumberFormat(locale, {
        minimumFractionDigits: decimals ?? 0,
        maximumFractionDigits: decimals ?? 2,
      }).format(value);
  }
}

export default function MetricCard({
  title,
  value,
  unit,
  trend = null,
  tooltip,
  isLoading = false,
  format,
  locale = "de-DE",
  decimals,
  className,
  currency = "EUR",
}: MetricCardProps) {
  const formatted = React.useMemo(
    () => formatValue(value, { format, locale, currency, decimals }),
    [value, format, locale, currency, decimals]
  );

  const hasTrend = typeof trend === "number" && Number.isFinite(trend);
  const trendPositive = (hasTrend && trend! > 0) || false;
  const trendZero = hasTrend && trend === 0;

  const TrendIcon = trendPositive ? ArrowUpRight : ArrowDownRight;

  const content = (
    <Card className={className ?? "w-full"}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-7 w-32" />
            <Skeleton className="h-4 w-20" />
          </div>
        ) : (
          <>
            <div className="text-2xl font-bold tabular-nums">
              {formatted}
              {!format && unit && <span className="ml-1 text-base font-normal">{unit}</span>}
            </div>

            {hasTrend && !trendZero && (
              <div
                className={`mt-1 inline-flex items-center gap-1 text-sm ${
                  trendPositive ? "text-green-600" : "text-red-600"
                }`}
              >
                <TrendIcon className="h-4 w-4" aria-hidden />
                <span className="tabular-nums">
                  {new Intl.NumberFormat(locale, {
                    style: "percent",
                    minimumFractionDigits: 1,
                    maximumFractionDigits: 1,
                  }).format(trend!)}
                </span>
              </div>
            )}

            {hasTrend && trendZero && (
              <div className="mt-1 text-sm text-muted-foreground">±0%</div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );

  return tooltip ? (
    <Tooltip>
      <TooltipTrigger asChild>{content}</TooltipTrigger>
      <TooltipContent>{tooltip}</TooltipContent>
    </Tooltip>
  ) : (
    content
  );
}
