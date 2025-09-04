'use client';

import * as React from 'react';
import FrequencyOnboardingFlow from './FrequencyOnboardingDialog';

export default function ResetAndOpenOnboarding({ userId }: { userId: string }) {
  const [open, setOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [msg, setMsg] = React.useState<string | null>(null);

  const doReset = async () => {
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
      console.log('resetOnboarding result:', j);
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
        className="px-3 py-2 rounded border bg-white hover:bg-gray-50 disabled:opacity-50"
        title={!userId ? 'Bitte einloggen' : 'Onboarding zurücksetzen & starten'}
      >
        {busy ? 'Zurücksetzen…' : 'Onboarding zurücksetzen & starten'}
      </button>

      {msg && <div className="text-xs text-gray-600 mt-2">{msg}</div>}

      <FrequencyOnboardingFlow
        open={open}
        onOpenChange={setOpen}
        onFinishedAll={() => setOpen(false)}
        userId={userId}
      />
    </>
  );
}
