"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { allExercises, Exercise } from "@/pages/api/sport/ExerciseDetail";
import { useMetaVisionProgress } from "@/hooks/useMetaVisionProgress";
import VideoPlayer from "./VideoPlayer";

export default function ExerciseDetail() {
  const router = useRouter();
  const { level, slug } = router.query as { level?: string; slug?: string };
  const [exercise, setExercise] = useState<Exercise | undefined>();
  const { markExerciseCompleted } = useMetaVisionProgress();

  useEffect(() => {
    if (slug && level) {
      const ex = allExercises.find(
        (e) => e.slug === slug && e.level === Number(level)
      );
      setExercise(ex);
    }
  }, [slug, level]);

  if (!exercise) return <div>Lade...</div>;

  return (
    <div className="p-4 space-y-2">
      <h2 className="text-xl font-bold">{exercise.name}</h2>
      <p>{exercise.description}</p>
      <div>
        <h3 className="font-semibold">Aufbau</h3>
        <p>{exercise.setup}</p>
      </div>
      <div>
        <h3 className="font-semibold">Ablauf</h3>
        <p>{exercise.execution}</p>
      </div>
      <div>
        <h3 className="font-semibold">Ziel</h3>
        <p>{exercise.goal}</p>
      </div>
      <VideoPlayer type={exercise.animationType} src={exercise.animationUrl} />
      <button
        onClick={() => {
          markExerciseCompleted(exercise.id);
          router.back();
        }}
        className="mt-4 bg-primary text-white px-4 py-2 rounded"
      >
        Als erledigt markieren
      </button>
    </div>
  );
}
