import React from "react";
import SetExpensesPage from "./setExpenses"; // Importiere mit Großbuchstaben
import FinancialSummary from "./financialSummary"; // Importiere die FinancialSummary-Komponente

const FinanceOverview = () => {
  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold text-center text-blue-600 mb-6">
        Finance Overview
      </h1>

      {/* Finanzübersicht */}
      <FinancialSummary />

      {/* Aktivitäten */}
      <div className="bg-white shadow-lg rounded-lg p-6 mb-6">
        <h2 className="text-2xl font-semibold text-gray-700 mb-4">
          Recent Transactions
        </h2>
        <ul className="space-y-3">
          <li className="flex justify-between">
            <span className="text-gray-600">Deposit:</span>
            <span className="text-green-600 font-semibold">+$1,000</span>
          </li>
          <li className="flex justify-between">
            <span className="text-gray-600">Expense:</span>
            <span className="text-red-600 font-semibold">
              -$200 (Groceries)
            </span>
          </li>
          <li className="flex justify-between">
            <span className="text-gray-600">Investment:</span>
            <span className="text-blue-600 font-semibold">
              +$500 (Stock Purchase)
            </span>
          </li>
        </ul>
      </div>

      {/* Komponente für Ausgaben hinzufügen */}
      <SetExpensesPage />
    </div>
  );
};

export default FinanceOverview;
