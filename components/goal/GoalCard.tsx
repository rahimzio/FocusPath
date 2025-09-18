import React from "react";
import { Goal } from "@/utils/interface";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";
import { Pencil, MoveRight, Trash2, Copy, CheckCircle2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { normalizeGoalType, computeGoalProgress } from "@/utils/goals/progress";

interface GoalCardProps {
  goal: Goal;
  onEdit: (goal: Goal) => void;
  onMove: (goal: Goal) => void;
  onDelete: (goalId: string) => void;
  onDuplicate: (goalId: string) => void;
  onReflect?: (goal: Goal) => void;
  onToggleComplete: (goal: Goal) => void;
}

const GoalCard: React.FC<GoalCardProps> = ({
  goal,
  onEdit,
  onMove,
  onDelete,
  onDuplicate,
  onReflect,
  onToggleComplete,
}) => {
  const type = normalizeGoalType((goal as any).goalType || (goal as any).type);

  const colorClass =
    type === "weekly"
      ? "border-blue-500"
      : type === "monthly"
      ? "border-orange-500"
      : type === "yearly"
      ? "border-purple-500"
      : type === "daily"
      ? "border-emerald-500"
      : type === "once"
      ? "border-slate-400"
      : type === "mental"
      ? "border-pink-500"
      : "border-gray-300";

  const hasStructure =
    Array.isArray((goal as any).tasks) || Array.isArray((goal as any).subGoals);
  const derived = hasStructure ? computeGoalProgress(goal as any) : (goal.progress ?? 0);
  const progress = Math.max(
    0,
    Math.min(100, typeof goal.progress === "number" ? goal.progress : derived)
  );
  const isDone = progress >= 100 || !!goal.completedAt;

  const isExpired = new Date(goal.endDate) < new Date() && !isDone;
  const soon =
    !isDone &&
    Number.isFinite(new Date(goal.endDate).getTime()) &&
    new Date(goal.endDate).getTime() - Date.now() < 3 * 86400000;

  let progressTag: React.ReactNode = null;
  if (isDone) {
    progressTag = <span className="text-xs text-green-600">🏁 100%</span>;
  } else if (progress >= 80) {
    progressTag = <span className="text-xs text-orange-600">🔥 {progress}%</span>;
  } else if (soon) {
    progressTag = <span className="text-xs text-yellow-600">🕓 Bald fällig</span>;
  }

  return (
    <div
      className={`group relative isolate overflow-hidden transition-shadow border-l-4 ${colorClass} bg-white rounded-lg shadow-sm hover:shadow-lg ${
        isDone ? "ring-1 ring-inset ring-green-200 bg-green-50" : ""
      }`}
      role="article"
      aria-label={`Ziel: ${goal.title}`}
    >
      <div className="p-4">
        <div className="flex justify-between items-start gap-2">
          <h3
            className={`text-base font-semibold text-gray-800 ${
              isDone ? "line-through text-gray-600" : ""
            }`}
          >
            {goal.title}
            {isExpired && (
              <span className="text-xs text-red-500 ml-2">Abgelaufen</span>
            )}
          </h3>

          {(goal as any).category ? (
            <span className="shrink-0 text-[11px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 border">
              {(goal as any).category}
            </span>
          ) : null}
        </div>

        {goal.description && (
          <p
            className={`text-sm mt-1 ${
              isDone ? "text-gray-500 line-through" : "text-muted-foreground"
            }`}
          >
            {goal.description}
          </p>
        )}

        <div className="mt-2">
          <Progress
            value={isDone ? 100 : progress}
            aria-label={`Fortschritt ${isDone ? 100 : progress}%`}
          />
          <div className="mt-1 flex flex-wrap items-center gap-2">
            {progressTag}
            <span className="text-xs text-gray-500">
              {isDone ? 100 : progress}%
            </span>
            {goal.completedAt && (
              <span className="text-xs text-gray-500">
                · Erledigt am{" "}
                {new Date(goal.completedAt).toLocaleString()}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Aktionen: auf Mobile immer sichtbar, ab md nur bei Hover */}
      <div className="flex justify-end gap-2 px-4 pb-4 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
        <TooltipProvider delayDuration={100}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => onEdit(goal)}
                aria-label="Ziel bearbeiten"
                title="Bearbeiten"
              >
                <Pencil className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Bearbeiten</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => onMove(goal)}
                aria-label="Ziel verschieben"
                title="Verschieben"
              >
                <MoveRight className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Verschieben</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => onToggleComplete(goal)}
                aria-label={isDone ? "Als unerledigt markieren" : "Ziel abhaken"}
                title={isDone ? "Rückgängig" : "Abhaken"}
              >
                <CheckCircle2 className={`w-4 h-4 ${isDone ? "text-green-600" : ""}`} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{isDone ? "Rückgängig" : "Abhaken"}</TooltipContent>
          </Tooltip>

          <AlertDialog>
            <Tooltip>
              <TooltipTrigger asChild>
                <AlertDialogTrigger asChild>
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label="Ziel löschen"
                    title="Löschen"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </AlertDialogTrigger>
              </TooltipTrigger>
              <TooltipContent>Löschen</TooltipContent>
            </Tooltip>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  Bist du sicher, dass du dieses Ziel löschen möchtest? Diese
                  Aktion kann nicht rückgängig gemacht werden.
                </AlertDialogTitle>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                <AlertDialogAction onClick={() => onDelete(goal._id)}>
                  Löschen
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => onDuplicate(goal._id)}
                aria-label="Ziel duplizieren"
                title="Duplizieren"
              >
                <Copy className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Duplizieren</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {isDone && onReflect && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onReflect(goal)}
            title="Reflexion starten"
          >
            Reflexion
          </Button>
        )}
      </div>
    </div>
  );
};

export default GoalCard;
