"use client";
import { useEffect, useState } from "react";

export type MetaProgress = {
  level1: boolean;
  level2: boolean;
  level3: boolean;
  level4: boolean;
  completedExercises: string[];
  passedTests: number[];
};

const defaultProgress: MetaProgress = {
  level1: true,
  level2: false,
  level3: false,
  level4: false,
  completedExercises: [],
  passedTests: [],
};

export function useMetaVisionProgress() {
  const [progress, setProgress] = useState<MetaProgress>(defaultProgress);

  useEffect(() => {
    const stored = localStorage.getItem("metaVisionProgress");
    if (stored) {
      try {
        setProgress(JSON.parse(stored) as MetaProgress);
      } catch {
        // ignore malformed data
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("metaVisionProgress", JSON.stringify(progress));
  }, [progress]);

  const markExerciseCompleted = (id: string) => {
    setProgress((p) => {
      if (p.completedExercises.includes(id)) return p;
      return { ...p, completedExercises: [...p.completedExercises, id] };
    });
  };

  const passTest = (level: number) => {
    setProgress((p) => {
      if (p.passedTests.includes(level)) return p;
      const updated = { ...p, passedTests: [...p.passedTests, level] };
      if (level === 1) updated.level2 = true;
      if (level === 2) updated.level3 = true;
      if (level === 3) updated.level4 = true;
      return updated;
    });
  };

  return { progress, markExerciseCompleted, passTest };
}
