"use client";
import { useRouter } from "next/router";
import { useMetaVisionProgress } from "@/hooks/useMetaVisionProgress";
import { allExercises } from "./ExerciseData";
import { Progress } from "@/components/ui/progress";

export default function MetaVisionHome() {
  const router = useRouter();
  const { progress } = useMetaVisionProgress();
  const levels = [1, 2, 3, 4] as const;

  const levelExerciseCount = (lvl: number) =>
    allExercises.filter((e) => e.level === lvl).length;

  const completedCount = (lvl: number) =>
    progress.completedExercises.filter((id) => {
      const ex = allExercises.find((e) => e.id === id);
      return ex?.level === lvl;
    }).length;

  const unlocked = (lvl: number) => {
    if (lvl === 1) return true;
    if (lvl === 2) return progress.level2;
    if (lvl === 3) return progress.level3;
    if (lvl === 4) return progress.level4;
    return false;
  };

  return (
    <div className="p-4 grid gap-4 md:grid-cols-2">
      {levels.map((lvl) => (
        <div key={lvl} className="border rounded-lg p-4 shadow">
          <h2 className="text-xl font-bold mb-2">Level {lvl}</h2>
          {!unlocked(lvl) && <p className="text-sm">Gesperrt</p>}
          {unlocked(lvl) && (
            <>
              <Progress
                value={
                  (completedCount(lvl) / levelExerciseCount(lvl)) * 100 || 0
                }
                className="mb-2"
              />
              <button
                onClick={() => router.push(`/meta-vision/level/${lvl}`)}
                className="bg-primary text-white px-3 py-1 rounded"
              >
                Öffnen
              </button>
            </>
          )}
        </div>
      ))}
    </div>
  );
}
