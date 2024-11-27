// components/trading/TradeHistory.tsx
import React from "react";

const TradeHistory = () => {
  // Beispielhafte Daten
  const trades = [
    { time: "12:00", price: 250, amount: 0.1 },
    { time: "12:05", price: 251, amount: 0.2 },
    // Weitere Trades...
  ];

  return (
    <div>
      <h2>Handelshistorie</h2>
      <table>
        <thead>
          <tr>
            <th>Zeit</th>
            <th>Preis</th>
            <th>Menge</th>
          </tr>
        </thead>
        <tbody>
          {trades.map((trade, index) => (
            <tr key={index}>
              <td>{trade.time}</td>
              <td>{trade.price}</td>
              <td>{trade.amount}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default TradeHistory;
