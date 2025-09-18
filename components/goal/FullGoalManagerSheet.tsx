import React, { useEffect, useMemo, useState } from "react";
import { getSession } from "next-auth/react";
import { Goal } from "@/utils/interface";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetClose,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import GoalCard from "./GoalCard";
import GoalCreateSheet from "./GoalCreateSheet";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filter: "all" | "monthly" | "yearly" | "past";
  setFilter: (filter: "all" | "monthly" | "yearly" | "past") => void;
  yearly: Goal[];
  monthly: Goal[];
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

  // Filter für Wiederholung (einmalig/wiederkehrend)
  const [recurrenceFilter, setRecurrenceFilter] =
    useState<RecurrenceFilter>("all");

  useEffect(() => {
    getSession().then((session) => {
      if (session?.user?.id) {
        setUserId(session.user.id);
        fetch(`/api/user/categories?userId=${session.user.id}`)
          .then((res) => res.json())
          .then((data) => setCategories(data.categories || []))
          .catch(() => setCategories([]));
      }
    });
  }, []);

  // Kategorie-Filter
  const filterByCategory = (goals: Goal[]) => {
    if (categoryFilter === "all") return goals;
    if (categorySource === "goal") {
      return goals.filter((g) => (g as any).category === categoryFilter);
    }
    // categorySource === 'task'
    return goals.filter((g) =>
      g.tasks?.some((t) => t.category === categoryFilter)
    );
  };

  // Wiederholungs-Filter
  const filterByRecurrence = (goals: Goal[]) => {
    if (recurrenceFilter === "all") return goals;
    if (recurrenceFilter === "oneoff") {
      return goals.filter((g) => (g as any).recurring === false);
    }
    return goals.filter((g) => (g as any).recurring === true);
  };

  // Pipeline
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
      <SheetContent className="w-full sm:max-w-[720px] md:max-w-[860px] sm:ml-auto sm:mr-0 h-full overflow-y-auto p-0 bg-background">
        {/* Sticky Header + Filterbar – sichtbar durch Verlauf + Border + Schatten */}
        <div className="sticky top-0 z-10 border-b shadow-sm bg-gradient-to-r from-slate-50 to-slate-100 dark:from-zinc-800 dark:to-zinc-800">
          <SheetHeader className="px-4 sm:px-6 pt-4 pb-3">
            <div className="flex items-center justify-between gap-2">
              <SheetTitle className="text-lg font-semibold text-slate-900 dark:text-zinc-50">
                📚 Alle Ziele
              </SheetTitle>
              <SheetClose asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Schließen"
                  className="rounded-full"
                >
                  <X className="w-5 h-5" />
                </Button>
              </SheetClose>
            </div>

            <div className="mt-2 flex flex-wrap gap-2">
              {/* Typ-Filter */}
              <Select
                value={filter}
                onValueChange={(v) => setFilter(v as Props["filter"])}
              >
                <SelectTrigger className="w-[150px] bg-white dark:bg-zinc-900">
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
                <SelectTrigger className="w-[190px] bg-white dark:bg-zinc-900">
                  <SelectValue placeholder="Kategorie-Quelle" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="goal">Goal.category</SelectItem>
                  <SelectItem value="task">Task.category</SelectItem>
                </SelectContent>
              </Select>

              {/* Kategorie-Wert */}
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[180px] bg-white dark:bg-zinc-900">
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

              {/* Wiederholung */}
              <Select
                value={recurrenceFilter}
                onValueChange={(v) => setRecurrenceFilter(v as RecurrenceFilter)}
              >
                <SelectTrigger className="w-[180px] bg-white dark:bg-zinc-900">
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
        </div>

        {/* Inhalt */}
        <div className="space-y-8 py-6 px-4 sm:px-6">
          {showMonthly && (
            <section>
              <h3 className="font-semibold mb-3 text-slate-900 dark:text-zinc-50">
                📅 Monatsziele{" "}
                {categoryFilter !== "all" && (
                  <span className="text-xs text-muted-foreground">
                    – gefiltert
                  </span>
                )}
              </h3>
              {monthlyFiltered.length ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {monthlyFiltered.map((g) => (
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
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Keine Monatsziele vorhanden
                </p>
              )}
            </section>
          )}

          {showYearly && (
            <section>
              <h3 className="font-semibold mb-3 text-slate-900 dark:text-zinc-50">
                📆 Jahresziele{" "}
                {categoryFilter !== "all" && (
                  <span className="text-xs text-muted-foreground">
                    – gefiltert
                  </span>
                )}
              </h3>
              {yearlyFiltered.length ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {yearlyFiltered.map((g) => (
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
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Keine Jahresziele vorhanden
                </p>
              )}
            </section>
          )}

          {showPast && (
            <section>
              <h3 className="font-semibold mb-3 text-slate-900 dark:text-zinc-50">
                🕑 Vergangene Ziele{" "}
                {categoryFilter !== "all" && (
                  <span className="text-xs text-muted-foreground">
                    – gefiltert
                  </span>
                )}
              </h3>
              {pastFiltered.length ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {pastFiltered.map((g) => (
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
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Keine vergangenen Ziele
                </p>
              )}
            </section>
          )}

          <div className="pt-4 border-t flex items-center justify-between">
            <GoalCreateSheet onGoalCreated={onGoalCreated} />
            <SheetClose asChild>
              <Button variant="outline">Schließen</Button>
            </SheetClose>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default FullGoalManagerSheet;
