'use client';

import * as React from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { FrequencyTasksDialog } from './FrequencyOnboardingDialog';

export default function FrequencySettingsButton() {
  const { data: session } = useSession();
  const userId = (session as any)?.user?.id || '';
  const [open, setOpen] = React.useState(false);

  if (!userId) return null;

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        Frequenz-Tasks verwalten
      </Button>
      <FrequencyTasksDialog open={open} onOpenChange={setOpen} userId={userId} />
    </>
  );
}
