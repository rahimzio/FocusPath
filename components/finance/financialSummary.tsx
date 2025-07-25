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
          <span>Total Balance:</span>
          <span className="font-semibold text-green-600">$10,000</span>
        </div><div className="flex justify-between text-sm">
          <span>Investments:</span>
          <span className="font-semibold text-blue-600">$5,000</span>
        </div>
        <div className="flex justify-between text-sm">
          <span>Expenses:</span>
          <span className="font-semibold text-red-600">$2,000</span>
        </div>
        <div className="flex justify-between text-sm">
          <span>Net Worth:</span>
          <span className="font-semibold text-indigo-600">$13,000</span>
        </div>     </CardContent>
    </Card>
  );
};

// Removed duplicate default export
