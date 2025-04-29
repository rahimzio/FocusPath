// questionBank.ts

export interface FrequencyQuestion {
    id: string;
    category: string;
    type: "freitext" | "skala" | "multiple";
    currentVersion: string;
    idealVersion: string;
    options?: string[]; // bei multiple / skala
    min?: number;
    max?: number;
  }
  
  export const frequencyQuestions: FrequencyQuestion[] = [
    {
      id: "react_failure",
      category: "Verhalten",
      type: "freitext",
      currentVersion: "Wie reagierst du aktuell, wenn etwas schiefläuft?",
      idealVersion: "Wie möchtest du reagieren, wenn etwas schiefläuft?"
    },
    {
      id: "stress_behavior",
      category: "Verhalten",
      type: "freitext",
      currentVersion: "Wie reagierst du aktuell unter Stress?",
      idealVersion: "Wie würdest du in deinem höchsten Zustand mit Stress umgehen?"
    },
    {
      id: "self_belief",
      category: "Selbstbild",
      type: "skala",
      currentVersion: "Wie stark glaubst du aktuell an dich selbst?",
      idealVersion: "Wie stark wäre dein Selbstvertrauen auf deiner höchsten Frequenz?",
      min: 1,
      max: 5
    },
    {
      id: "conviction_action",
      category: "Selbstbild",
      type: "freitext",
      currentVersion: "Wie handelst du, wenn du von etwas überzeugt bist?",
      idealVersion: "Wie würdest du handeln, wenn du 100 % mit dir im Einklang bist?"
    },
    {
      id: "emotions",
      category: "Emotionen",
      type: "multiple",
      currentVersion: "Welche Emotionen spürst du derzeit regelmäßig?",
      idealVersion: "Welche Emotionen möchtest du täglich fühlen?",
      options: ["Dankbarkeit", "Freude", "Vertrauen", "Frieden", "Begeisterung", "Liebe", "Neugier"]
    },
    {
      id: "thinking_challenges",
      category: "Denkweise",
      type: "skala",
      currentVersion: "Wie denkst du aktuell über Herausforderungen?",
      idealVersion: "Wie möchtest du über Herausforderungen denken?",
      min: 1,
      max: 5
    },
    {
      id: "decision_making",
      category: "Denkweise",
      type: "skala",
      currentVersion: "Wie triffst du Entscheidungen momentan? (1 = rational, 5 = intuitiv)",
      idealVersion: "Wie sollte dein Entscheidungsstil sein, wenn du dir vertraust?",
      min: 1,
      max: 5
    },
    {
      id: "body_language",
      category: "Körpersprache",
      type: "multiple",
      currentVersion: "Wie trittst du aktuell körperlich auf?",
      idealVersion: "Wie bewegt sich dein Traum-Ich?",
      options: ["aufrecht", "ruhig", "kraftvoll", "zielstrebig", "leicht"]
    },
    {
      id: "ideal_day",
      category: "Vision",
      type: "freitext",
      currentVersion: "Wie sieht ein typischer Tag aktuell bei dir aus?",
      idealVersion: "Wie sieht dein idealer Tag aus?"
    },
    {
      id: "values",
      category: "Werte",
      type: "multiple",
      currentVersion: "Welche Werte lebst du aktuell am stärksten?",
      idealVersion: "Welche 3 Werte soll dein Traum-Ich verkörpern?",
      options: ["Mut", "Klarheit", "Authentizität", "Liebe", "Hingabe", "Freiheit", "Gelassenheit", "Fokus"]
    },
    {
      id: "shadows",
      category: "Schattenmuster",
      type: "freitext",
      currentVersion: "Welche Muster wiederholen sich bei dir negativ?",
      idealVersion: "Welche Muster willst du loslassen?"
    },
    {
      id: "inspiration",
      category: "Inspiration",
      type: "freitext",
      currentVersion: "Welche Person inspiriert dich zurzeit?",
      idealVersion: "Wer ist dein ultimatives Vorbild und warum?"
    },
    {
      id: "block_mind",
      category: "Blockaden",
      type: "freitext",
      currentVersion: "–",
      idealVersion: "Welche Denkweise hindert dich an deiner Traumfrequenz?"
    },
    {
      id: "block_behavior",
      category: "Blockaden",
      type: "freitext",
      currentVersion: "–",
      idealVersion: "Welches Verhalten hält dich von deiner Frequenz ab?"
    }
  ];