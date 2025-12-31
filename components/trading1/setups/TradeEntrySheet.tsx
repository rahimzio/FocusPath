// components/trading/trades/TradeEntrySheet.tsx
"use client";

import * as React from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import type { TradeEntry, TradingSetup } from "../interface";
import { TradeEntryForm } from "./TradeEntryForm";

interface TradeEntrySheetProps {
  userId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode?: "create" | "edit";
  initialData?: TradeEntry;
  availableSetups?: TradingSetup[];
  onSaved?: (trade: TradeEntry) => void;
}

export const TradeEntrySheet: React.FC<TradeEntrySheetProps> = ({
  userId,
  open,
  onOpenChange,
  mode = "create",
  initialData,
  availableSetups,
  onSaved,
}) => {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl lg:max-w-2xl p-4 sm:p-6 flex flex-col">
        <SheetHeader className="mb-2">
          <SheetTitle className="text-base sm:text-lg">
            {mode === "edit" ? "Trade bearbeiten" : "Neuen Trade loggen"}
          </SheetTitle>
        </SheetHeader>

        <div className="mt-2 flex-1 overflow-y-auto pr-1 sm:pr-2">
          <TradeEntryForm
            userId={userId}
            mode={mode}
            initialData={initialData}
            availableSetups={availableSetups}
            onSuccess={(trade) => {
              onSaved?.(trade);
              onOpenChange(false);
            }}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default TradeEntrySheet;
