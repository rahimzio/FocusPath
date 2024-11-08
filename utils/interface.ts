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
  