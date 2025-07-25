// components/trading/TradeHistory.tsx
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
const TradeHistory = () => {
  // Beispielhafte Daten
  const trades = [
    { time: "12:00", price: 250, amount: 0.1 },
    { time: "12:05", price: 251, amount: 0.2 },
    // Weitere Trades...
  ];

  return (
        <Card>
      <CardHeader>
        <CardTitle>Handelshistorie</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Zeit</TableHead>
              <TableHead>Preis</TableHead>
              <TableHead>Menge</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {trades.map((trade, index) => (
              <TableRow key={index}>
                <TableCell>{trade.time}</TableCell>
                <TableCell>{trade.price}</TableCell>
                <TableCell>{trade.amount}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default TradeHistory;
