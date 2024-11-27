// components/trading/OrderBook.tsx
import React from "react";

const OrderBook = () => {
  // Beispielhafte Daten
  const orders = [
    { price: 250, amount: 1.2, type: "buy" },
    { price: 251, amount: 0.5, type: "sell" },
    // Weitere Orders...
  ];

  return (
    <div>
      <h2>Orderbuch</h2>
      <table>
        <thead>
          <tr>
            <th>Preis</th>
            <th>Menge</th>
            <th>Typ</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order, index) => (
            <tr key={index}>
              <td>{order.price}</td>
              <td>{order.amount}</td>
              <td>{order.type}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default OrderBook;
