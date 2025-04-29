// FrequencyModels.ts

export interface FrequencySnapshot {
    userId: string;
    date: string; // YYYY-MM-DD
    type: "morning" | "evening";
    answers: Record<string, string | number | string[]>;
    frequencyScore: number; // 0–100
    colorCode: "red" | "yellow" | "green" | "white";
    comment?: string;
    gapAnalysis?: FrequencyGapEntry[];
  }
  
  export interface FrequencyGapEntry {
    id: string;
    category: string;
    gap: number; // 0–1
    comment: string;
  }
  
  export interface FrequencyProfile {
    userId: string;
    createdAt: string;
    updatedAt?: string;
    idealAnswers: Record<string, string | number | string[]>;
  }
  
  // OPTIONAL: Verlauf der Entwicklung für später
  export interface FrequencyHistoryEntry {
    date: string;
    morningScore?: number;
    eveningScore?: number;
    dominantEmotion?: string;
    averageGap?: number;
  }
  
  export interface FrequencyUserMeta {
    userId: string;
    lastCompleted: string; // Datum der letzten Frequenzanalyse
    profileCompleted: boolean;
    frequencyStreak?: number;
    history: FrequencyHistoryEntry[];
  }
  
  type FrequencyRecommendation = {
    title: string;
    description: string;
    category: "Mindset" | "Körper" | "Emotion" | "Verhalten";
    gapReason: string; // z. B. „Du hast dich unter Stress zurückgezogen“
    basedOn: string; // z. B. "Frage: Stressverhalten"
  };
  