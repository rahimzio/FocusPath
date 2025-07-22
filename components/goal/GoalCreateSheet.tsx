"use client";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import NewGoalForm from "./createGoal";
import { Goal } from "@/utils/interface";

type Props = {
  onGoalCreated?: (goal: Goal) => void;
};

export default function GoalCreateSheet({ onGoalCreated }: Props) {
  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Sheet>
        <SheetTrigger asChild>
          <Button>Neues Ziel erstellen</Button>
        </SheetTrigger>
        <SheetContent className="w-[400px] sm:w-[540px] max-h-[100vh] overflow-y-auto text-black">
          <SheetHeader>
            <SheetTitle>Neues Ziel erstellen</SheetTitle>
          </SheetHeader>
          <NewGoalForm onGoalCreated={onGoalCreated || (() => {})} />
        </SheetContent>
      </Sheet>
    </div>
  );
}