'use client';

import * as React from 'react';
import FrequencyOnboardingFlow from './FrequencyOnboardingDialog';

export default function ResetAndOpenOnboarding({ userId }: { userId: string }) {
  const [open, setOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [msg, setMsg] = React.useState<string | null>(null);

  const doReset = async () => {
    if (!userId || busy) return;
    setBusy(true);
    setMsg(null);
    try {
      const r = await fetch('/api/frequency/resetOnboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          wipeBase: true,
          wipeModels: true,
          wipeTasks: true,
          wipeReflections: false,
        }),
      });
      const j = await r.json();
      if (!j.ok && !j.success) throw new Error(j.error || 'Reset failed');
      setMsg(`Reset ok${j.debugId ? ` (debugId ${j.debugId})` : ''}`);
      setOpen(true); // Dialog direkt wieder öffnen
    } catch (e: any) {
      setMsg(`Reset error: ${e.message}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button
        onClick={doReset}
        disabled={!userId || busy}
        className="
          w-full sm:w-auto
          inline-flex items-center justify-center gap-2
          px-3 sm:px-4 py-2 rounded border
          bg-white hover:bg-gray-50
          disabled:opacity-50 disabled:cursor-not-allowed
          text-sm sm:text-base
        "
        title={!userId ? 'Bitte einloggen' : 'Onboarding zurücksetzen & starten'}
        aria-label="Onboarding zurücksetzen & starten"
      >
        {/* Mobile: Icon/kurz; Desktop: voller Text */}
        <span className="sm:hidden" aria-hidden>🔁</span>
        <span>{busy ? 'Zurücksetzen…' : 'Onboarding zurücksetzen & starten'}</span>
      </button>

      {msg && (
        <div className="text-xs text-gray-600 mt-2 break-words">
          {msg}
        </div>
      )}

      <FrequencyOnboardingFlow
        open={open}
        onOpenChange={setOpen}
        onFinishedAll={() => setOpen(false)}
        userId={userId}
      />
    </>
  );
}
