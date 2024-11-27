import React, { useState } from 'react';
import { DayPicker, DayPickerProvider } from 'react-day-picker';
import { Card } from '../ui/card';
import { CardContent } from '../ui/card';
import { CardHeader } from '../ui/card';
import { CardTitle } from '../ui/card';
import { Button } from '../ui/button';

const FinanceOverview = () => {
  const [expenses, setExpenses] = useState([
    { name: 'Miete', amount: 800, date: '2024-11-01' },
    { name: 'Stromrechnung', amount: 150, date: '2024-11-05' },
    { name: 'Internet', amount: 50, date: '2024-11-10' },
    { name: 'Lebensmittel', amount: 300, date: '2024-11-15' },
    { name: 'Versicherung', amount: 100, date: '2024-11-20' },
    { name: 'Freizeit', amount: 200, date: '2024-11-25' },
  ]);

  // Alle Ausgabentage extrahieren
  const expenseDates = expenses.map((expense) => expense.date);

  // Definieren von Modifikatoren, um Tage zu markieren
  const modifiers = expenseDates.reduce((acc: any, date: string) => {
    const formattedDate = new Date(date).toISOString().split('T')[0]; // Format YYYY-MM-DD
    acc[formattedDate] = { marked: true }; // Markiere das Datum
    return acc;
  }, {});

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Finanzübersicht</h1>

      {/* Monatsübersicht */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <Card>
          <CardHeader>
            <CardTitle>Gesamtausgaben</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-semibold">
              {expenses.reduce((acc, expense) => acc + expense.amount, 0)} €
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sparziele</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-semibold">1000 € (Monatlich)</p>
            <Button>Zu Sparzielen</Button>
          </CardContent>
        </Card>
      </div>

      {/* Kalender mit markierten Ausgabentagen */}
      <div className="mb-4">
        <h2 className="text-xl font-semibold mb-2">Rechnungen im Kalender</h2>
        <DayPickerProvider initialProps={{ selected: new Date(), modifiers }}>
          <DayPicker selected={new Date()} modifiers={modifiers} />
        </DayPickerProvider>
      </div>

      {/* Button zum Hinzufügen neuer Ausgaben */}
      <div className="mb-4">
        <Button onClick={() => alert('Funktion zum Hinzufügen neuer Ausgaben wird hier implementiert.')}>
          Neue Ausgabe hinzufügen
        </Button>
      </div>
    </div>
  );
};

export default FinanceOverview;
