// onboarding/OnboardingProvider.tsx
'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';

type State = {
  version: string;
  completed: Record<string, boolean>;
  isFirstRun: boolean;
};

type Ctx = {
  state: State;
  isDone: (id: string) => boolean;
  markDone: (id: string) => void;
  startFlow: (flowId: string) => void;
  reset: (version: string) => void;
};

const STORAGE_KEY = 'onboarding:v2';
const CURRENT_VERSION = 'v2';
const DEFAULT_STATE: State = { version: CURRENT_VERSION, completed: {}, isFirstRun: true };

const OnbCtx = createContext<Ctx | null>(null);

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<State>(DEFAULT_STATE);
  const [ready, setReady] = useState(false);

  // Hydration: lese localStorage *nach* Mount
  useEffect(() => {
    try {
      const raw = typeof window !== 'undefined' ? window.localStorage.getItem(STORAGE_KEY) : null;
      if (raw) {
        const parsed = JSON.parse(raw) as State;
        if (parsed.version === CURRENT_VERSION) {
          setState(parsed);
        } else {
          // Versionswechsel → reset
          setState({ ...DEFAULT_STATE });
        }
      }
    } catch {
      setState({ ...DEFAULT_STATE });
    } finally {
      setReady(true);
    }
  }, []);

  // Persistenz
  useEffect(() => {
    if (ready) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }
  }, [ready, state]);

  const api = useMemo<Ctx>(
    () => ({
      state,
      isDone: (id: string) => !!state.completed[id],
      markDone: (id: string) =>
        setState((s) =>
          s.completed[id]
            ? s
            : { ...s, completed: { ...s.completed, [id]: true }, isFirstRun: false }
        ),
      startFlow: (_flowId: string) => {
        /* reserviert für produktgeführte Touren */
      },
      reset: (version: string) => setState({ version, completed: {}, isFirstRun: true }),
    }),
    [state]
  );

  // Bis hydration fertig ist, nichts rendern → kein UI-Flicker
  if (!ready) return null;

  return <OnbCtx.Provider value={api}>{children}</OnbCtx.Provider>;
}

export const useOnboarding = () => {
  const ctx = useContext(OnbCtx);
  if (!ctx) throw new Error('OnboardingProvider missing');
  return ctx;
};
