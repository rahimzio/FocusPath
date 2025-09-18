'use client';

import * as React from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { FrequencyTasksDialog } from './FrequencyOnboardingDialog';
import { Settings } from 'lucide-react';

export default function FrequencySettingsButton() {
  const { data: session } = useSession();
  const userId = (session as any)?.user?.id || '';
  const [open, setOpen] = React.useState(false);

  if (!userId) return null;

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setOpen(true)}
        className="h-9 px-3 sm:px-4 inline-flex items-center gap-2"
        aria-label="Frequenz-Tasks verwalten"
      >
        {/* Mobile: nur Icon; ab sm: Icon + Text */}
        <Settings className="h-4 w-4" aria-hidden />
        <span className="hidden sm:inline">Frequenz-Tasks verwalten</span>
      </Button>
      <FrequencyTasksDialog open={open} onOpenChange={setOpen} userId={userId} />
    </>
  );
}
