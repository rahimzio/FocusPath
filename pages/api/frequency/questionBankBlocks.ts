// utils/frequenz/questionBankBlocks.ts
export type Domain = "Mindset" | "Emotion" | "Body" | "Behavior" | "Social" | "Environment";

export interface BlockQuestion {
  id: string;
  label: string;
  domain: Domain;
  inverted?: boolean; // negative Items werden invertiert (Stress, Zweifel etc.)
  weight?: number;    // default 1.0; z. B. 1.2 für Schlüssel-Items
}

export const questionsByBlock: Record<"morning" | "afternoon" | "evening", BlockQuestion[]> = {
  morning: [
    { id: "calm",      label: "Ich fühle innere Ruhe und Klarheit.", domain: "Emotion" },
    { id: "convict",   label: "Ich traue mir mein wichtigstes Vorhaben heute zu.", domain: "Mindset" },
    { id: "energy",    label: "Mein Körper fühlt sich wach und energiegeladen an.", domain: "Body" },
    { id: "intent",    label: "Ich handle heute absichtsvoll statt reaktiv.", domain: "Behavior" },
    { id: "gratAM",    label: "Ich spüre heute früh echte Dankbarkeit.", domain: "Emotion" },
    { id: "doubt",     label: "Ich zweifle an mir oder an meinem Plan.", domain: "Mindset", inverted: true },
    { id: "envReady",  label: "Meine Umgebung unterstützt Fokus (Ordnung, ruhiger Start).", domain: "Environment" },
    { id: "socialSafe",label: "Ich fühle mich sozial sicher und unterstützt.", domain: "Social" },
  ],
  afternoon: [
    { id: "focus",     label: "Ich blieb heute fokussiert bei meinen Aufgaben.", domain: "Behavior" },
    { id: "stress",    label: "Ich war gestresst/überwältigt.", domain: "Emotion", inverted: true },
    { id: "flow",      label: "Ich hatte heute Momente von Flow.", domain: "Mindset" },
    { id: "move",      label: "Ich habe mich heute ausreichend bewegt.", domain: "Body" },
    { id: "distract",  label: "Ich ließ mich viel ablenken (Phone, Tabs, Chat).", domain: "Behavior", inverted: true },
    { id: "socialMID", label: "Ich hatte heute mindestens eine positive Interaktion.", domain: "Social" },
    { id: "envNoise",  label: "Meine Umgebung war störend (Lärm/Chaos).", domain: "Environment", inverted: true },
  ],
  evening: [
    { id: "gratPM",    label: "Ich empfinde Dankbarkeit für den heutigen Tag.", domain: "Emotion" },
    { id: "proud",     label: "Ich bin stolz auf mein Verhalten heute.", domain: "Mindset" },
    { id: "bodyCare",  label: "Ich habe meinen Körper gut behandelt (Ernährung/Schlaf/Regeneration).", domain: "Body" },
    { id: "integrity", label: "Ich habe mit Integrität gehandelt (Versprechen gehalten).", domain: "Behavior", weight: 1.2 },
    { id: "peace",     label: "Ich fühle inneren Frieden statt Grübeln.", domain: "Emotion" },
    { id: "resent",    label: "Ich empfinde Groll/Neid/Verbitterung.", domain: "Emotion", inverted: true },
    { id: "socialPM",  label: "Ich fühlte heute echte Verbundenheit mit jemandem.", domain: "Social" },
    { id: "envWind",   label: "Mein Abend-Setup unterstützt Erholung (Licht/Screen-off/Ordnung).", domain: "Environment" },
  ],
};
