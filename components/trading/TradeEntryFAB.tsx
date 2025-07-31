"use client";
import React, { useState } from "react";
import TradeEntryForm from "@/components/trading/TradeEntryForm";
import { PlusCircle } from "lucide-react";
import { Sheet, SheetTrigger, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

interface Props {
  userId: string;
  date: string;
}

export default function TradeEntryFAB({ userId, date }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          size="icon"
          className="fixed bottom-6 right-6 bg-blue-600 text-white shadow-lg hover:bg-blue-500"
        >
          <PlusCircle />
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="sm:max-w-lg">
        <Card>
          <CardHeader>
            <CardTitle>Trade hinzufügen</CardTitle>
          </CardHeader>
          <CardContent>
            <TradeEntryForm
              userId={userId}
              date={date}
              onCreated={() => setOpen(false)}
            />
          </CardContent>
        </Card>
      </SheetContent>
    </Sheet>
  );
}
