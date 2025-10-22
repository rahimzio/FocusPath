"use client";

import * as React from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import NewGoalForm from "./createGoal";
import { Plus } from "lucide-react";
import { Goal } from "@/utils/interfaces/goal";

type Props = {
  onGoalCreated?: (goal: Goal) => void;
  /** Optional: extern kontrolliertes Öffnen */
  open?: boolean;
  /** Optional: externes onOpenChange */
  onOpenChange?: (open: boolean) => void;
  /** Optional: versteckt den Trigger-Button (wenn du extern öffnest) */
  hideTrigger?: boolean;
};

export default function GoalCreateSheet({
  onGoalCreated,
  open,
  onOpenChange,
  hideTrigger,
}: Props) {
  // controlled/uncontrolled Handling
  const isControlled = typeof open === "boolean" && typeof onOpenChange === "function";
  const [internalOpen, setInternalOpen] = React.useState(false);
  const actualOpen = isControlled ? (open as boolean) : internalOpen;
  const setOpen = isControlled ? (onOpenChange as (o: boolean) => void) : setInternalOpen;

  const handleGoalCreated = (goal: Goal) => {
    // ggf. nach außen reichen
    onGoalCreated?.(goal);
    // Sheet schließen
    setOpen(false);
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Sheet open={actualOpen} onOpenChange={setOpen}>
        {!hideTrigger && (
          <SheetTrigger asChild>
            {/* Mobile: runder FAB (nur Icon) · ab sm: Button mit Label */}
            <Button
              className="rounded-full h-12 w-12 p-0 shadow-lg sm:h-auto sm:w-auto sm:rounded-md sm:px-4 sm:py-2"
              aria-label="Neues Ziel erstellen"
              title="Neues Ziel erstellen"
            >
              <Plus className="h-5 w-5 sm:mr-2" />
              <span className="hidden sm:inline">Neues Ziel</span>
            </Button>
          </SheetTrigger>
        )}

        {/* Vollbreit auf Mobile, begrenzt auf Desktop */}
        <SheetContent className="w-full sm:max-w-[540px] sm:ml-auto sm:mr-0 h-[100dvh] sm:h-auto overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Neues Ziel erstellen</SheetTitle>
          </SheetHeader>

          <div className="pb-6">
            <NewGoalForm onGoalCreated={handleGoalCreated} />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
