// financialSummary.tsx
"use client";
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Props {
  income: number;
  expenses: number;
  savings: number;
}

export default function FinancialSummary({ income, expenses, savings }: Props) {
  const inc = Number.isFinite(income) ? income : 0;
  const exp = Number.isFinite(expenses) ? expenses : 0;
  const sav = Number.isFinite(savings) ? savings : 0;

  const balance = inc - exp - sav;

  const fmt = (n: number) =>
    new Intl.NumberFormat("de-DE", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(n);

  const incomeCls = "font-semibold tabular-nums text-green-600";
  const expenseCls = "font-semibold tabular-nums text-red-600";
  const savingsCls = "font-semibold tabular-nums";
  const balanceCls =
    "font-semibold tabular-nums " + (balance < 0 ? "text-red-600" : "text-green-600");

  return (
    <Card className="w-full max-w-full overflow-hidden mb-6">
      <CardHeader>
        <CardTitle className="text-gray-900 dark:text-gray-100">
          Finanzübersicht
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm sm:text-base">
        <div className="flex items-center justify-between gap-2">
          <span>Einkommen:</span>
          <span className={incomeCls}>{fmt(inc)}</span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span>Ausgaben:</span>
          <span className={expenseCls}>{fmt(exp)}</span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span>Gespart:</span>
          <span className={savingsCls}>{fmt(sav)}</span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span>Verfügbar:</span>
          <span className={balanceCls}>{fmt(balance)}</span>
        </div>
      </CardContent>
    </Card>
  );
}
