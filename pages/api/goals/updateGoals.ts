// /api/goals/progress.ts
import { getGoalById, getTasksByGoal, updateGoal,calculateProgress } from './progress';


const updateGoalProgress = async (goalId: string) => {
  try {
    // Hole das Ziel
    const goal = await getGoalById(goalId);
    if (!goal) {
      throw new Error('Ziel nicht gefunden');
    }

    // Hole alle Aufgaben, die mit diesem Ziel verbunden sind
    const tasks = await getTasksByGoal(goalId);
    if (!tasks || tasks.length === 0) {
      throw new Error('Keine Aufgaben gefunden');
    }

    // Berechne den Fortschritt
    const progress = calculateProgress(tasks);

    // Aktualisiere das Ziel mit dem neuen Fortschritt
    const updatedGoal = await updateGoal(goalId, { progress });

    return updatedGoal;
  } catch (error) {
    console.error('Fehler beim Aktualisieren des Ziels:', error);
    throw new Error('Fehler beim Aktualisieren des Ziels');
  }
};

export default updateGoalProgress;
