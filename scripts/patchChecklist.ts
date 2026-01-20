async function patchChecklist(args: {
  userId: string;
  setupId: string;
  entryChecklistState: ChecklistState[];
}) {
  const setupIdStr = String(args.setupId ?? "").trim();

  const payload = {
    userId: String(args.userId ?? "").trim(),

    // ✅ Sende ALLES (falls Server andere Key erwartet)
    setupId: setupIdStr,
    id: setupIdStr,
    _id: setupIdStr,

    entryChecklistState: args.entryChecklistState,
  };

  // ✅ FULL payload BEFORE send
  console.log("[patchChecklist] payload BEFORE send:", payload);

  const res = await fetch("/api/trading/setups/update-checklist", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await res.json().catch(() => null);

  console.log("[patchChecklist] status:", res.status);
  console.log("[patchChecklist] response:", data);

  if (!res.ok) {
    throw new Error(data?.message ?? "Failed to update checklist");
  }

  return data;
}
