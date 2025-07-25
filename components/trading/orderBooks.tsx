// components/trading/OrderBook.tsx
import React from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
  TableCell,
} from "@/components/ui/table";
const OrderBook = () => {
  // Beispielhafte Daten
  const orders = [
    { price: 250, amount: 1.2, type: "buy" },
    { price: 251, amount: 0.5, type: "sell" },
    // Weitere Orders...
  ];

  return (
       <Card>
      <CardHeader>
        <CardTitle>Orderbuch</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Preis</TableHead>
              <TableHead>Menge</TableHead>
              <TableHead>Typ</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((order, index) => (
              <TableRow key={index}>
                <TableCell>{order.price}</TableCell>
                <TableCell>{order.amount}</TableCell>
                <TableCell>{order.type}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default OrderBook;
