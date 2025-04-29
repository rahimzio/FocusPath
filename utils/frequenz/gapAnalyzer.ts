// GapAnalyzer.ts
import { FrequencyQuestion } from "./questionBank";

export interface FrequencyGapResult {
  id: string;
  label: string;
  category: string;
  type: "freitext" | "skala" | "multiple";
  current: string | number | string[];
  ideal: string | number | string[];
  gap: number; // 0 = kein Unterschied, 1 = maximaler Unterschied
  comment: string;
}

export function analyzeFrequencyGap(
  currentAnswers: { [id: string]: string | number | string[] },
  idealAnswers: { [id: string]: string | number | string[] },
  questions: FrequencyQuestion[]
): FrequencyGapResult[] {
  return questions.map((q) => {
    const current = currentAnswers[q.id];
    const ideal = idealAnswers[q.id];
    let gap = 0;
    let comment = "";

    switch (q.type) {
      case "skala":
        if (typeof current === "number" && typeof ideal === "number" && q.max && q.min !== undefined) {
          const range = q.max - q.min;
          gap = Math.abs(current - ideal) / range;
          comment = gap === 0
            ? "Du bist hier sehr im Einklang mit deiner Idealvorstellung."
            : gap < 0.4
              ? "Du bist nah dran – bleib dran!"
              : "Hier lohnt es sich, gezielt daran zu arbeiten.";
        }
        break;
      case "multiple":
        if (Array.isArray(current) && Array.isArray(ideal)) {
          const total = new Set([...current, ...ideal]).size;
          const intersection = current.filter((value) => ideal.includes(value)).length;
          gap = 1 - intersection / total;
          comment = gap === 0
            ? "Deine Gefühlslage stimmt gut mit deiner Vision überein."
            : gap < 0.4
              ? "Ein paar Emotionen fehlen noch – du bist auf dem Weg."
              : "Große Diskrepanz – vielleicht lohnt sich Fokus auf emotionale Ausrichtung.";
        }
        break;
      case "freitext":
        const c = (current as string)?.toLowerCase().trim() || "";
        const i = (ideal as string)?.toLowerCase().trim() || "";
        gap = c === i ? 0 : 1;
        comment = gap === 0
          ? "Antworten stimmen überein – starke Klarheit."
          : "Deine aktuelle und ideale Beschreibung unterscheiden sich – das zeigt Entwicklungspotenzial.";
        break;
    }

    return {
      id: q.id,
      label: q.idealVersion,
      category: q.category,
      type: q.type,
      current,
      ideal,
      gap: parseFloat(gap.toFixed(2)),
      comment,
    };
  });
}