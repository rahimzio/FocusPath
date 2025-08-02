"use client";
import { useState } from "react";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import TradeEntryForm from "./TradeEntryForm";

interface AddTradeModalProps {
  userId: string;
}

export default function AddTradeModal({ userId }: AddTradeModalProps) {
  const [open, setOpen] = useState(false);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Trade eintragen</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Neuer Trade</DialogTitle>
        </DialogHeader>
        <TradeEntryForm
          date={today}
          userId={userId}
          onCreated={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}