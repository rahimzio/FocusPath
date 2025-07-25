import React, { useState } from "react";
import { expense } from "@/utils/interface"; // Stelle sicher, dass der Import korrekt ist
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
const SetExpensesPage = () => {
  const [expenses, setExpenses] = useState<expense[]>([]);
  const [expenseName, setExpenseName] = useState<string>("");
  const [amount, setAmount] = useState<number>(0);
  const [category, setCategory] = useState<string>("");
  const [frequency, setFrequency] = useState<string>("monthly");
  const [dueDate, setDueDate] = useState<string>("");
  const [note, setNote] = useState<string>("");

  const handleAddExpense = async () => {
    const newExpense: expense = {
      name: expenseName,
      amount,
      category,
      note,
      frequency,
      dueDate,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const res = await fetch("/api/finance/save", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(newExpense),
    });

    const data = await res.json();
    if (data.expenseId) {
      setExpenses((prevExpenses) => [...prevExpenses, newExpense]);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold text-center text-blue-600 mb-6">
        Finance Overview
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Eingabefelder */}
        <Input
          type="text"
          placeholder="Expense Name"
          value={expenseName}
          onChange={(e) => setExpenseName(e.target.value)}
          className="p-3 border-2 border-gray-300 rounded-md w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <Input
          type="number"
          placeholder="Amount"
          value={amount}
          onChange={(e) => setAmount(Number(e.target.value))}
          className="p-3 border-2 border-gray-300 rounded-md w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <Input
          type="text"
          placeholder="Category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="p-3 border-2 border-gray-300 rounded-md w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <Input
          type="text"
          placeholder="Note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="p-3 border-2 border-gray-300 rounded-md w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <Input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          className="p-3 border-2 border-gray-300 rounded-md w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="flex justify-center mb-6">
        <Button onClick={handleAddExpense}>Add Expense</Button>
      </div>

      {/* Liste der Ausgaben */}
      <h2 className="text-2xl font-semibold text-gray-700 mb-4">Monthly Expenses</h2>
      <div className="bg-gray-50 p-6 rounded-lg shadow-md">
        <h2 className="text-2xl font-semibold text-gray-700 mb-4">
          Monthly Expenses
        </h2>
        {expenses.length === 0 ? (
          <p className="text-gray-500">No expenses added yet.</p>
        ) : (
          <div className="grid gap-2">            {expenses.map((expense, index) => (
            <Card key={index}>
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <h3 className="font-semibold">{expense.name}</h3>
                  <p className="text-sm text-muted-foreground">{expense.category}</p>
                  <p className="text-sm text-muted-foreground">{expense.frequency}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{expense.amount} EUR</p>
                  <p className="text-sm text-muted-foreground">{expense.dueDate}</p>
                </div>
              </CardContent>
            </Card>
          ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SetExpensesPage;
