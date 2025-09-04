// /lib/api/tasks.ts – nutzt deine vorhandenen Routen
export async function completeTask(goalId: string, taskId: string) {
  const res = await fetch("/api/tasks/completeTask", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ goalId, taskId }),
  });
  if (!res.ok) throw new Error("completeTask failed");
  return res.json();
}

export async function updateTaskStatus(goalId: string, taskId: string, status: string) {
  const res = await fetch("/api/tasks/updateStatus", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ goalId, taskId, status }),
  });
  if (!res.ok) throw new Error("updateStatus failed");
  return res.json();
}

// falls du Subtasks über dieselbe Route abbilden willst:
export async function updateSubTaskStatus(goalId: string, taskId: string, subTaskId: string, status: string) {
  const res = await fetch("/api/tasks/updateStatus", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ goalId, taskId, subTaskId, status }),
  });
  if (!res.ok) throw new Error("updateStatus (subtask) failed");
  return res.json();
}
