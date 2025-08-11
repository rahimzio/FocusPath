'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import StepFormIdeal from './StepFormIdeal';
import StepFormCurrent from './StepFormCurrent';

// ⛳️ Passe diese Pfade an deinen Projektbaum an:


type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onFinished: (data: {
    current: any; // typisieren wenn du magst
    ideal: any;
  }) => void;
};

export default function FrequencyOnboardingDialog({ open, onOpenChange, onFinished }: Props) {
  const [step, setStep] = useState<1 | 2>(1);
  const [currentData, setCurrentData] = useState<any>(null);
  const [idealData, setIdealData] = useState<any>(null);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {step === 1 ? 'Dein aktueller Frequenz-Zustand' : 'Dein idealer Frequenz-Zustand'}
          </DialogTitle>
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-4">
            <StepFormCurrent
              value={currentData}
              onChange={setCurrentData}
            />
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => onOpenChange(false)}>Später</Button>
              <Button
                onClick={() => setStep(2)}
                disabled={!currentData}
              >
                Weiter
              </Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <StepFormIdeal
              value={idealData}
              onChange={setIdealData}
            />
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(1)}>Zurück</Button>
              <Button
                onClick={() => idealData && onFinished({ current: currentData, ideal: idealData })}
                disabled={!idealData}
              >
                Fertig
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
