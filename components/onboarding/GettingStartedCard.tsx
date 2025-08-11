'use client';

import Link from 'next/link';
import { Check } from 'lucide-react';
import { useOnboarding } from './OnboardingProvider';

export default function GettingStartedCard() {
  const { isDone, markDone } = useOnboarding();

  const steps = [
    { id: 'todos_emptystate_seen', label: 'Erste Aufgabe anlegen', href: '/' },
    { id: 'goals_intro_seen', label: 'Erstes Ziel erstellen', href: '/overview/goals' },
    { id: 'finance_wizard_done', label: 'Finanz-Budget setzen', href: '/overview/finance' },
  ];

  const allDone = steps.every((s) => isDone(s.id));
  if (allDone || isDone('getting_started_dismissed')) return null;

  return (
    <div className="border rounded-xl bg-white p-4 shadow-sm w-full max-w-xs">
      <div className="flex justify-between items-start mb-2">
        <h3 className="text-sm font-semibold">Getting Started</h3>
        <button
          className="text-xs text-gray-500"
          onClick={() => markDone('getting_started_dismissed')}
        >
          Später
        </button>
      </div>
      <ul className="space-y-1">
        {steps.map((step) => (
          <li key={step.id} className="flex items-center gap-2 text-sm">
            {isDone(step.id) ? (
              <Check className="w-4 h-4 text-green-500" />
            ) : (
              <span className="w-4 h-4 border rounded-full" />
            )}
            <Link href={step.href} className="hover:underline">
              {step.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}