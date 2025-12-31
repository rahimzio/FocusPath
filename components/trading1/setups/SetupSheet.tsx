// components/trading1/setups/SetupSheet.tsx
"use client";

import * as React from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

import SetupForm from "./SetupForm";
import type { TradingSetup } from "../interface";

interface SetupSheetProps {
  userId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode?: "create" | "edit";
  initialData?: TradingSetup | null;
  onSaved?: (setup: TradingSetup) => void;
}

export const SetupSheet: React.FC<SetupSheetProps> = ({
  userId,
  open,
  onOpenChange,
  mode = "create",
  initialData,
  onSaved,
}) => {
  const isEdit = mode === "edit" && !!initialData?._id;

  return (
    <Sheet
      open={open}
      onOpenChange={(nextOpen) => {
        onOpenChange(nextOpen);
        // beim Schließen Editing-State draußen aufräumen (macht das Dashboard)
      }}
    >
      <SheetContent
        side="right"
        className="w-full sm:max-w-xl lg:max-w-2xl p-4 sm:p-6 flex flex-col"
      >
        <SheetHeader className="mb-2">
          <SheetTitle className="text-base sm:text-lg">
            {isEdit ? "Setup bearbeiten" : "Neues Setup anlegen"}
          </SheetTitle>
        </SheetHeader>

        <div className="mt-2 flex-1 overflow-y-auto pr-1 sm:pr-2">
          <SetupForm
            userId={userId}
            mode={isEdit ? "edit" : "create"}
            initialData={initialData ?? undefined}
            onSuccess={(saved) => {
              // 🔹 Liste neu laden
              onSaved?.(saved);
              // 🔹 Sheet (und damit dein Stepper-Formular) schließen
              onOpenChange(false);
            }}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default SetupSheet;
