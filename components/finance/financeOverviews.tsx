import React from "react";

const FinanceOverview = () => {
  return (
    <div className="finance-overview">
      <h1>Finance Overview</h1>
      <div className="finance-summary">
        <p>Total Balance: $10,000</p>
        <p>Investments: $5,000</p>
        <p>Expenses: $2,000</p>
        <p>Net Worth: $13,000</p>
      </div>
      <div className="financial-activities">
        <h2>Recent Transactions</h2>
        <ul>
          <li>Deposit: +$1,000</li>
          <li>Expense: -$200 (Groceries)</li>
          <li>Investment: +$500 (Stock Purchase)</li>
        </ul>
      </div>
    </div>
  );
};

export default FinanceOverview;
