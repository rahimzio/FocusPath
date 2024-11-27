// /api/goals/progress

import { Goal, Task } from "@/utils/interface";

const updateGoalProgress = async (goalId: string) => {
    const goal = await getGoalById(goalId); // Hole das Ziel
    const tasks = await getTasksByGoal(goalId); // Hole alle Aufgaben, die diesem Ziel zugeordnet sind
  
    const completedTasks = tasks.filter((task) => task.status === 'complete');
    const progress = (completedTasks.length / tasks.length) * 100;
  
    // Aktualisiere das Ziel mit dem neuen Fortschritt
    await updateGoal(goalId, { progress });
  };


  const tasksContainer = client.database('your-database-name').container('tasks');

export const getTasksByGoal = async (goalId: string) => {
  const { resources: tasks } = await tasksContainer.items.query({
    query: 'SELECT * FROM c WHERE ARRAY_CONTAINS(c.linkedGoals, @goalId)',
    parameters: [{ name: '@goalId', value: goalId }],
  }).fetchAll();
  
  return tasks;
};

// /utils/progress.ts
export const calculateProgress = (tasks: Task[]) => {
    const completedTasks = tasks.filter((task) => task.status === 'complete');
    const progress = (completedTasks.length / tasks.length) * 100;
    return progress;
  };

// /utils/db.ts
export const updateGoal = async (goalId: string, updateData: Partial<Goal>) => {
    const { resource: updatedGoal } = await container.item(goalId).replace({
      ...updateData,
      goalId, // Sicherstellen, dass das `goalId` erhalten bleibt
    });
    return updatedGoal;
  };
  