import React from "react";

const FinancialSummary = () => {
  return (
    <div className="bg-white shadow-lg rounded-lg p-6 mb-6">
      <h2 className="text-2xl font-semibold text-gray-700 mb-4">
        Financial Summary
      </h2>
      <div className="space-y-4">
        <div className="flex justify-between">
          <span className="text-lg text-gray-600">Total Balance:</span>
          <span className="text-lg font-semibold text-green-600">$10,000</span>
        </div>
        <div className="flex justify-between">
          <span className="text-lg text-gray-600">Investments:</span>
          <span className="text-lg font-semibold text-blue-600">$5,000</span>
        </div>
        <div className="flex justify-between">
          <span className="text-lg text-gray-600">Expenses:</span>
          <span className="text-lg font-semibold text-red-600">$2,000</span>
        </div>
        <div className="flex justify-between">
          <span className="text-lg text-gray-600">Net Worth:</span>
          <span className="text-lg font-semibold text-indigo-600">$13,000</span>
        </div>
      </div>
    </div>
  );
};

export default FinancialSummary;
