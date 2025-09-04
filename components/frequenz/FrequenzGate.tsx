'use client';

import { useEffect, useState } from 'react';
import { useOnboarding } from '../onboarding/OnboardingProvider';
import FrequencyOnboardingFlow from './FrequencyOnboardingDialog';
import { useSession } from 'next-auth/react';

type Props = { children: React.ReactNode; };
const FREQ_FLAG = 'freq:onboarding_done';

export default function FrequenzGate({ children }: Props) {
  const { data: session } = useSession();
  const userId = (session as any)?.user?.id || '';

  const { isDone, markDone } = useOnboarding();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!isDone(FREQ_FLAG)) setOpen(true);
  }, [isDone]);

  return (
    <>
      {!isDone(FREQ_FLAG) && (
        <FrequencyOnboardingFlow
          open={open}
          onOpenChange={setOpen}
          onFinishedAll={() => markDone(FREQ_FLAG)}
          userId={userId} // <- NEU: optional weiterreichen
        />
      )}
      {children}
    </>
  );
}
