'use client';

import { useEffect, useState } from 'react';
import { useOnboarding } from '../onboarding/OnboardingProvider';
import FrequencyOnboardingDialog from './FrequencyOnboardingDialog';

type Props = {
  children: React.ReactNode;
};

const FREQ_FLAG = 'freq:onboarding_done';

export default function FrequenzGate({ children }: Props) {
  const { isDone, markDone } = useOnboarding();
  const [open, setOpen] = useState(false);

  // beim ersten Besuch öffnen, wenn noch nicht erledigt
  useEffect(() => {
    if (!isDone(FREQ_FLAG)) setOpen(true);
  }, [isDone]);

  return (
    <>
      {!isDone(FREQ_FLAG) && (
        <FrequencyOnboardingDialog
          open={open}
          onOpenChange={setOpen}
          onFinished={(payload:any) => {
            // TODO: hier kannst du payload zu deiner API speichern
            // await fetch('/api/frequenz/onboarding', { method: 'POST', body: JSON.stringify(payload) })
            markDone(FREQ_FLAG);
            setOpen(false);
          }}
        />
      )}
      {children}
    </>
  );
}
