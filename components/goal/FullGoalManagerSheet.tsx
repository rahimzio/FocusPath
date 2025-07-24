import React from "react";
import { Goal } from "@/utils/interface";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import GoalCard from "./GoalCard";
import GoalCreateSheet from "./GoalCreateSheet";

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    filter: string;
    setFilter: (filter: string) => void;
    monthly: Goal[];
    yearly: Goal[];
    past: Goal[];
    onEdit: (goal: Goal) => void;
    onMove: (goal: Goal) => void;
    onDelete: (goalId: string) => void;
    onDuplicate: (goalId: string) => void;
    onReflect?: (goal: Goal) => void;
    onGoalCreated?: (goal: Goal) => void;
    onToggleComplete: (goal: Goal) => void;
}

const FullGoalManagerSheet: React.FC<Props> = ({
    open,
    onOpenChange,
    filter,
    setFilter,
    monthly,
    yearly,
    past,
    onEdit,
    onMove,
    onDelete,
    onDuplicate,
    onReflect,
    onToggleComplete,
    onGoalCreated
}) => {
    const showMonthly = filter === "all" || filter === "monthly";
    const showYearly = filter === "all" || filter === "yearly";
    const showPast = filter === "all" || filter === "past";

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="w-full sm:max-w-[640px] sm:ml-auto sm:mr-0 h-full sm:h-auto overflow-y-auto">
                <SheetHeader>
                    <SheetTitle className="text-lg font-semibold">📚 Alle Ziele</SheetTitle>
                    <div className="mt-2">
                        <Select value={filter} onValueChange={setFilter}>
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Filter" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Alle</SelectItem>
                                <SelectItem value="monthly">Monatsziele</SelectItem>
                                <SelectItem value="yearly">Jahresziele</SelectItem>
                                <SelectItem value="past">Vergangene</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </SheetHeader>

                <div className="space-y-6 py-6">
                    {showMonthly && (
                        <section>
                            <h3 className="font-semibold mb-2">📅 Monatsziele</h3>
                            {monthly.length ? (
                                monthly.map((g) => (
                                    <GoalCard key={g._id} goal={g} onEdit={onEdit} onMove={onMove} onDelete={onDelete} onDuplicate={onDuplicate} onReflect={onReflect} onToggleComplete={onToggleComplete} />
                                ))
                            ) : (
                                <p className="text-sm text-muted-foreground">Keine Monatsziele vorhanden</p>
                            )}
                        </section>
                    )}

                    {showYearly && (
                        <section>
                            <h3 className="font-semibold mb-2">📆 Jahresziele</h3>
                            {yearly.length ? (
                                yearly.map((g) => (
                                    <GoalCard key={g._id} goal={g} onToggleComplete={onToggleComplete} onEdit={onEdit} onMove={onMove} onDelete={onDelete} onDuplicate={onDuplicate} onReflect={onReflect} />
                                ))
                            ) : (
                                <p className="text-sm text-muted-foreground">Keine Jahresziele vorhanden</p>
                            )}
                        </section>
                    )}

                    {showPast && (
                        <section>
                            <h3 className="font-semibold mb-2">🕑 Vergangene Ziele</h3>
                            {past.length ? (
                                past.map((g) => (
                                    <GoalCard key={g._id} goal={g}  onToggleComplete={onToggleComplete} onEdit={onEdit} onMove={onMove} onDelete={onDelete} onDuplicate={onDuplicate} onReflect={onReflect} />
                                ))
                            ) : (
                                <p className="text-sm text-muted-foreground">Keine vergangenen Ziele</p>
                            )}
                        </section>
                    )}

                    <div className="pt-4 border-t">
                        <GoalCreateSheet onGoalCreated={onGoalCreated} />
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );
};

export default FullGoalManagerSheet;
