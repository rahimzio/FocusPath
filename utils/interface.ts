export interface Task {
    id: string;
    name: string;
    description: string;
    points: number;
    status: 'incomplete' | 'completed';  // Aufgabe kann 'incomplete' oder 'completed' sein
    dueDate: string;  // Deadline für die Aufgabe
    frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';  // Häufigkeit der Aufgabe
    category: string;  // Kategorie wie 'Fitness', 'Beruflich', etc.
    linkedApps: string[];  // Verlinkte Apps, z.B. 'stats', 'skilltree'
    createdAt: string;
    updatedAt: string;
  }
  

export interface expense {
  id?: string;         // Optional, wird für die eindeutige Identifizierung der Ausgabe benötigt
  name: string;        // Name der Ausgabe (z.B. "Miete", "Stromrechnung")
  amount: number;      // Betrag der Ausgabe (z.B. 150 EUR)
  category: string;    // Kategorie der Ausgabe (z.B. "Wohnen", "Essen")
  frequency: string;   // Häufigkeit der Ausgabe (z.B. "monatlich", "wöchentlich")
  dueDate: string;     // Fälligkeitsdatum der Ausgabe (z.B. "2024-10-31")
  createdAt: string;   // Erstellungsdatum der Ausgabe
  updatedAt: string;   // Letzte Aktualisierung der Ausgabe
}