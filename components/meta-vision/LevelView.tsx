"use client";
import { useRouter } from "next/router";
import ExerciseCard from "./ExerciseCard";
import { allExercises } from "@/pages/api/sport/ExerciseDetail";

export default function LevelView() {
  const router = useRouter();
  const { level } = router.query as { level?: string };
  const intLevel = Number(level);
  const exercises = allExercises.filter((e) => e.level === intLevel);

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-2xl font-bold">Level {level}</h2>
      <div className="grid gap-4 md:grid-cols-2">
        {exercises.map((ex) => (
          <ExerciseCard key={ex.id} exercise={ex} />
        ))}
      </div>
      <button
        onClick={() => router.push(`/meta-vision/level/${level}/test`)}
        className="mt-4 bg-primary text-white px-4 py-2 rounded"
      >
        Level-Up-Test
      </button>
    </div>
  );
}
