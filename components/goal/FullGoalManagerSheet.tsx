import React, { useEffect, useMemo, useState } from "react";
import { getSession } from "next-auth/react";
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

type CategorySource = "goal" | "task";
type RecurrenceFilter = "all" | "oneoff" | "recurring";

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
  onGoalCreated,
}) => {
  const showMonthly = filter === "all" || filter === "monthly";
  const showYearly = filter === "all" || filter === "yearly";
  const showPast = filter === "all" || filter === "past";

  const [userId, setUserId] = useState<string>("");
  const [categories, setCategories] = useState<string[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  // Quelle für Kategorie-Filter umschaltbar (Goal.category vs Task.category)
  const [categorySource, setCategorySource] = useState<CategorySource>("goal");

  // NEU: Filter für Wiederholung (einmalig/wiederkehrend)
  const [recurrenceFilter, setRecurrenceFilter] = useState<RecurrenceFilter>("all");

  useEffect(() => {
    getSession().then((session) => {
      if (session?.user?.id) {
        setUserId(session.user.id);
        fetch(`/api/user/categories?userId=${session.user.id}`)
          .then((res) => res.json())
          .then((data) => setCategories(data.categories || []));
      }
    });
  }, []);

  // Zentraler Filter nach Kategorie (goal- oder task-basiert)
  const filterByCategory = (goals: Goal[]) => {
    if (categoryFilter === "all") return goals;
    if (categorySource === "goal") {
      return goals.filter((g) => (g as any).category === categoryFilter);
    }
    // categorySource === 'task'
    return goals.filter((g) => g.tasks?.some((t) => t.category === categoryFilter));
  };

  // NEU: Filter nach Wiederholung
  const filterByRecurrence = (goals: Goal[]) => {
    if (recurrenceFilter === "all") return goals;
    if (recurrenceFilter === "oneoff") {
      // zeige nur Ziele mit explizit recurring === false
      return goals.filter((g) => (g as any).recurring === false);
    }
    // recurrenceFilter === "recurring"
    return goals.filter((g) => (g as any).recurring === true);
  };

  // Pipelining der Filter
  const monthlyFiltered = useMemo(
    () => filterByRecurrence(filterByCategory(monthly)),
    [monthly, categoryFilter, categorySource, recurrenceFilter]
  );
  const yearlyFiltered = useMemo(
    () => filterByRecurrence(filterByCategory(yearly)),
    [yearly, categoryFilter, categorySource, recurrenceFilter]
  );
  const pastFiltered = useMemo(
    () => filterByRecurrence(filterByCategory(past)),
    [past, categoryFilter, categorySource, recurrenceFilter]
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-[640px] sm:ml-auto sm:mr-0 h-full sm:h-auto overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-lg font-semibold">📚 Alle Ziele</SheetTitle>

          <div className="mt-2 flex flex-wrap gap-2">
            {/* Typ-Filter */}
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Typ" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle</SelectItem>
                <SelectItem value="monthly">Monatsziele</SelectItem>
                <SelectItem value="yearly">Jahresziele</SelectItem>
                <SelectItem value="past">Vergangene</SelectItem>
              </SelectContent>
            </Select>

            {/* Kategorie-Quelle */}
            <Select
              value={categorySource}
              onValueChange={(v) => setCategorySource(v as CategorySource)}
            >
              <SelectTrigger className="w-[190px]">
                <SelectValue placeholder="Kategorie-Quelle" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="goal">Goal.category</SelectItem>
                <SelectItem value="task">Task.category</SelectItem>
              </SelectContent>
            </Select>

            {/* Kategorie-Wert */}
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Kategorie" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* NEU: Wiederholung */}
            <Select
              value={recurrenceFilter}
              onValueChange={(v) => setRecurrenceFilter(v as RecurrenceFilter)}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Wiederholung" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle</SelectItem>
                <SelectItem value="oneoff">Einmalig</SelectItem>
                <SelectItem value="recurring">Wiederkehrend</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </SheetHeader>

        <div className="space-y-6 py-6">
          {showMonthly && (
            <section>
              <h3 className="font-semibold mb-2">
                📅 Monatsziele{" "}
                {categoryFilter !== "all" && (
                  <span className="text-xs text-muted-foreground">– gefiltert</span>
                )}
              </h3>
              {monthlyFiltered.length ? (
                monthlyFiltered.map((g) => (
                  <GoalCard
                    key={g._id}
                    goal={g}
                    onEdit={onEdit}
                    onMove={onMove}
                    onDelete={onDelete}
                    onDuplicate={onDuplicate}
                    onReflect={onReflect}
                    onToggleComplete={onToggleComplete}
                  />
                ))
              ) : (
                <p className="text-sm text-muted-foreground">Keine Monatsziele vorhanden</p>
              )}
            </section>
          )}

          {showYearly && (
            <section>
              <h3 className="font-semibold mb-2">
                📆 Jahresziele{" "}
                {categoryFilter !== "all" && (
                  <span className="text-xs text-muted-foreground">– gefiltert</span>
                )}
              </h3>
              {yearlyFiltered.length ? (
                yearlyFiltered.map((g) => (
                  <GoalCard
                    key={g._id}
                    goal={g}
                    onToggleComplete={onToggleComplete}
                    onEdit={onEdit}
                    onMove={onMove}
                    onDelete={onDelete}
                    onDuplicate={onDuplicate}
                    onReflect={onReflect}
                  />
                ))
              ) : (
                <p className="text-sm text-muted-foreground">Keine Jahresziele vorhanden</p>
              )}
            </section>
          )}

          {showPast && (
            <section>
              <h3 className="font-semibold mb-2">
                🕑 Vergangene Ziele{" "}
                {categoryFilter !== "all" && (
                  <span className="text-xs text-muted-foreground">– gefiltert</span>
                )}
              </h3>
              {pastFiltered.length ? (
                pastFiltered.map((g) => (
                  <GoalCard
                    key={g._id}
                    goal={g}
                    onToggleComplete={onToggleComplete}
                    onEdit={onEdit}
                    onMove={onMove}
                    onDelete={onDelete}
                    onDuplicate={onDuplicate}
                    onReflect={onReflect}
                  />
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
