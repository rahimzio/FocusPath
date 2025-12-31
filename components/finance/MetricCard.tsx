// MetricCard.tsx
import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

type Format = "number" | "currency" | "percent";
type Variant = "default" | "compact";

interface MetricCardProps {
  title: string;
  value: number;
  isLoading?: boolean;
  format?: Format;
  currency?: "EUR" | "USD"; // etc.
  className?: string;
  variant?: Variant;        // <— NEU
}

export default function MetricCard({
  title,
  value,
  isLoading,
  format = "number",
  currency = "EUR",
  className = "",
  variant = "default",      // <— NEU
}: MetricCardProps) {

  const isCompact = variant === "compact";

  const wrap = `
    ${className}
  `;

  const headerCls = isCompact
    ? "p-2 pb-1"
    : "p-4 pb-2";

  const contentCls = isCompact
    ? "p-2 pt-1 [&_.text-2xl]:text-sm [&_.text-xl]:text-sm [&_.text-base]:text-xs"
    : "p-4 pt-2";

  return (
    <Card className={wrap}>
      <CardHeader className={headerCls}>
        <CardTitle className={isCompact ? "text-sm" : "text-base"}>{title}</CardTitle>
      </CardHeader>
      <CardContent className={contentCls}>
        {/* Hier deine bestehende Value/Loader-Logik */}
        <div className={isCompact ? "text-sm font-semibold" : "text-2xl font-semibold"}>
          {/* formatiere value wie bisher */}
          {formatValue(value, format, currency)}
        </div>
      </CardContent>
    </Card>
  );
}

function formatValue(v: number, format: Format, currency: "EUR" | "USD") {
  // … deine bestehende Formatierung (unverändert)
  return v;
}
