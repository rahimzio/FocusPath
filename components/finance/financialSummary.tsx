import React from "react"; import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Props {
  income: number;
  expenses: number;
  savings: number;
}

export default function FinancialSummary({ income, expenses, savings }: Props) {
  const balance = income - expenses - savings;
  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Financial Summary</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>Einkommen:</span>
          <span className="font-semibold">{income} €</span>
        </div>
        <div className="flex justify-between text-sm">
          <span>Ausgaben:</span>
          <span className="font-semibold">{expenses} €</span>
        </div>
        <div className="flex justify-between text-sm">
          <span>Gespart:</span>
        <span className="font-semibold">{savings} €</span>
      </div>
      <div className="flex justify-between text-sm">
        <span>Verfügbar:</span>
        <span className="font-semibold">{balance} €</span>
      </div>
    </CardContent>
    </Card >
  );
};

// Removed duplicate default export
