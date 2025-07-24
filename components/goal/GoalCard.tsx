import React, { useState } from "react";import { Goal } from "@/utils/interface";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";
import { Pencil, MoveRight, Trash2, Copy,CheckCircle2  } from "lucide-react";
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
interface GoalCardProps {
  goal: Goal;
  onEdit: (goal: Goal) => void;
  onMove: (goal: Goal) => void;
  onDelete: (goalId: string) => void;
  onDuplicate: (goalId: string) => void;
  onReflect?: (goal: Goal) => void;
  onToggleComplete: (goal: Goal) => void;
}

const GoalCard: React.FC<GoalCardProps> = ({ goal, onEdit, onMove, onDelete, onDuplicate, onReflect,onToggleComplete  }) => {
  const isExpired = new Date(goal.endDate) < new Date() && goal.progress < 100;
  const type = goal.goalType || goal.type;

  const color =
    type === "weekly" ? "border-blue-500" :
    type === "monthly" ? "border-orange-500" :
    type === "yearly" ? "border-purple-500" : "border-gray-300";

  const soon =
    new Date(goal.endDate).getTime() - Date.now() < 3 * 86400000 &&
    goal.progress < 100;

  let progressTag: React.ReactNode = null;
  if (goal.progress === 100) {
    progressTag = <span className="text-xs text-green-600">🏁 100%</span>;
  } else if (goal.progress >= 80) {
    progressTag = <span className="text-xs text-orange-600">🔥 {goal.progress}%</span>;
  } else if (soon) {
    progressTag = <span className="text-xs text-yellow-600">🕓 Bald fällig</span>;
  }

  return (
    <div className={`group relative hover:shadow-lg transition-shadow border-l-4 ${color} bg-white rounded-lg shadow-sm`}>      <div className="p-4">
        <div className="flex justify-between items-center">
          <h3 className="text-base font-semibold text-gray-800">
            {goal.title}
            {isExpired && <span className="text-xs text-red-500 ml-2">Abgelaufen</span>}
          </h3>
        </div>

        <p className="text-sm text-muted-foreground mt-1">{goal.description}</p>

        <div className="mt-2">
          <Progress value={goal.progress} />
          {progressTag && <div className="mt-1">{progressTag}</div>}
          {goal.completedAt && (
            <div className="mt-1 text-xs text-gray-500">
              Erledigt am {new Date(goal.completedAt).toLocaleString()}
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-end gap-2 px-4 pb-4 opacity-0 group-hover:opacity-100 transition">
        <TooltipProvider delayDuration={100}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button size="icon" variant="ghost" onClick={() => onEdit(goal)}>
                <Pencil className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Bearbeiten</TooltipContent>
          </Tooltip>

 <Tooltip>
          <TooltipTrigger asChild>
            <Button size="icon" variant="ghost" onClick={() => onMove(goal)}>
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
            >
              <CheckCircle2
                className={`w-4 h-4 ${goal.progress === 100 ? "text-green-600" : ""}`}
              />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {goal.progress === 100 ? "Rückgängig" : "Abhaken"}
          </TooltipContent>
        </Tooltip>

          <AlertDialog>
            <Tooltip>
              <TooltipTrigger asChild>
                <AlertDialogTrigger asChild>
                  <Button size="icon" variant="ghost">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </AlertDialogTrigger>
              </TooltipTrigger>
              <TooltipContent>Löschen</TooltipContent>
            </Tooltip>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  Bist du sicher, dass du dieses Ziel löschen möchtest? Diese Aktion kann nicht rückgängig gemacht werden.
                </AlertDialogTitle>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                <AlertDialogAction onClick={() => onDelete(goal._id)}>Löschen</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button size="icon" variant="ghost" onClick={() => onDuplicate(goal._id)}>
                <Copy className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Duplizieren</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {goal.progress === 100 && onReflect && (
          <Button variant="outline" size="sm" onClick={() => onReflect(goal)}>
            Reflexion starten
          </Button>
        )}
      </div>
    </div>
  );
};

export default GoalCard;
