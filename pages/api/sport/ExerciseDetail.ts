export type Exercise = {
  id: string;
  level: 1 | 2 | 3 | 4;
  name: string;
  slug: string;
  description: string;
  setup: string;
  execution: string;
  goal: string;
  animationType: "video" | "svg";
  animationUrl: string;
  tags: string[];
};

export const allExercises: Exercise[] = [
  {
    id: "l1-ex1",
    level: 1,
    name: "La Croqueta Grundtechnik",
    slug: "la-croqueta-grundtechnik",
    description: "Einfache Einführung in die La Croqueta Technik.",
    setup: "Markiere einen kleinen Bereich mit Hütchen.",
    execution: "Führe die Bewegung langsam und kontrolliert aus.",
    goal: "Bessere Ballkontrolle und Spielübersicht.",
    animationType: "video",
    animationUrl: "/meta-vision-assets/level1/croqueta-basic.mp4",
    tags: ["La Croqueta", "Ballkontrolle"],
  },
  {
    id: "l1-ex2",
    level: 1,
    name: "Einfaches Scanning",
    slug: "einfaches-scanning",
    description: "Kopf regelmäßig heben und Umgebung prüfen.",
    setup: "Baue einen kleinen Dribble-Parcours auf.",
    execution: "Bei jedem dritten Schritt Schulterblick.",
    goal: "Frühes Erkennen von Spielsituationen.",
    animationType: "svg",
    animationUrl: "/meta-vision-assets/level1/scanning.svg",
    tags: ["Scanning"],
  },
  {
    id: "l2-ex1",
    level: 2,
    name: "Ampel-Dribbling",
    slug: "ampel-dribbling",
    description: "Dribbling mit Farbsignalen zur Richtungsänderung.",
    setup: "Nutze verschiedenfarbige Hütchen als Signale.",
    execution: "Reagiere auf zugerufene Farben mit Richtungswechsel.",
    goal: "Verbesserung der Reaktion auf visuelle Reize.",
    animationType: "svg",
    animationUrl: "/meta-vision-assets/level2/ampel-dribbling.svg",
    tags: ["Reaktion"],
  },
  {
    id: "l3-ex1",
    level: 3,
    name: "360° Scanning",
    slug: "360-scanning",
    description: "Ständiges Überprüfen der gesamten Umgebung.",
    setup: "Mitspielernummern oder Farben hinter dem Spieler.",
    execution: "Vor Ballannahme Information aufnehmen und verarbeiten.",
    goal: "Erhöhte Spielübersicht und schnellere Entscheidungen.",
    animationType: "video",
    animationUrl: "/meta-vision-assets/level3/360-scanning.mp4",
    tags: ["Scanning"],
  },
  {
    id: "l4-ex1",
    level: 4,
    name: "Profi Reaktionsparcours",
    slug: "profi-reaktionsparcours",
    description: "Komplexer Parcours mit zufälligen Signalen.",
    setup: "Trainer gibt unvorhersehbare Kommandos.",
    execution: "Schnelle Richtungswechsel und Blicksteuerung.",
    goal: "Maximale periphere Wahrnehmung unter Druck.",
    animationType: "video",
    animationUrl: "/meta-vision-assets/level4/profi-reaktion.mp4",
    tags: ["Reaktion", "Druck"],
  },
];
