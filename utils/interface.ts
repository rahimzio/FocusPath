export interface Task {
  _id: string;
  id: string;
  name: string;
  description: string;
  points: number;
  status: "incomplete" | "completed"; // Ändere hier den Status in "completed"
  dueDate: string; // Datum, z.B. '2024-11-08'
  timebased: boolean; // gibt an, ob eine Uhrzeit existiert
  time: string; // z.B. '12:00' (nur wenn timebased = true)
  frequency: "once" | "daily" | "weekly" | "monthly" | "yearly";
  category: string;
  linkedApps: string[];
  createdAt: string;
  updatedAt: string;
}


export interface Expense {
  id?: string;         // Optional, wird für die eindeutige Identifizierung der Ausgabe benötigt
  name: string;        // Name der Ausgabe (z.B. "Miete", "Stromrechnung")
  amount: number;      // Betrag der Ausgabe (z.B. 150 EUR)
  category: string;    // Kategorie der Ausgabe (z.B. "Wohnen", "Essen")
  frequency: string;   // Häufigkeit der Ausgabe (z.B. "monatlich", "wöchentlich")
  dueDate: string;     // Fälligkeitsdatum der Ausgabe (z.B. "2024-10-31")
  createdAt: string;   // Erstellungsdatum der Ausgabe
  updatedAt: string;   // Letzte Aktualisierung der Ausgabe
}


export interface Goals{
  id:string;
  title:string;
  description:string;
  dueDate:string;
  progress:number;
}