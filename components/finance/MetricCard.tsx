// MetricCard.tsx
"use client";
import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";

type ValueFormat = "number" | "currency" | "percent";

interface MetricCardProps {
  title: string;
  value: number | string;
  unit?: string;
  trend?: number | null;
  tooltip?: string;
  isLoading?: boolean;
  format?: ValueFormat;
  locale?: string;
  decimals?: number;
  className?: string;
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
  if (typeof value === "string") return value;
  if (typeof value !== "number" || !Number.isFinite(value)) return "—";

  switch (format) {
    case "currency":
      return new Intl.NumberFormat(locale, { style: "currency", currency }).format(value);
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
  const trendPositive = hasTrend && trend! > 0;
  const trendZero = hasTrend && trend === 0;
  const TrendIcon = trendPositive ? ArrowUpRight : ArrowDownRight;

  const content = (
    <Card className={className ? `w-full min-w-0 ${className}` : "w-full min-w-0"}>
      <CardHeader className="pb-2">
        {/* gut lesbarer Header in hell/dunkel, keine weißen Titel auf weißem BG */}
        <CardTitle className="text-xs sm:text-sm font-medium text-gray-800 dark:text-gray-200">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="min-w-0">
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-7 w-24 sm:w-32" />
            <Skeleton className="h-4 w-16 sm:w-20" />
          </div>
        ) : (
          <>
            <div className="text-xl sm:text-2xl font-bold tabular-nums break-words">
              {formatted}
              {!format && unit && (
                <span className="ml-1 text-sm sm:text-base font-normal text-gray-700 dark:text-gray-300">
                  {unit}
                </span>
              )}
            </div>

            {hasTrend && !trendZero && (
              <div
                className={`mt-1 inline-flex items-center gap-1 text-sm ${
                  trendPositive ? "text-green-600" : "text-red-600"
                }`}
                aria-label={`Trend ${new Intl.NumberFormat(locale, {
                  style: "percent",
                  minimumFractionDigits: 1,
                  maximumFractionDigits: 1,
                }).format(trend!)}`}
              >
                <TrendIcon className="h-4 w-4 shrink-0" aria-hidden />
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
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>{content}</TooltipTrigger>
        <TooltipContent className="max-w-[18rem] break-words">{tooltip}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  ) : (
    content
  );
}
