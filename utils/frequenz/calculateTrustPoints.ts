// utils/frequency/calculateTrustPoints.ts

export function calculateTrustPoints(responses: { [behavior: string]: boolean }): { delta: number; details: { behavior: string; change: number }[] } {
    let totalDelta = 0;
    const details: { behavior: string; change: number }[] = [];
  
    for (const [behavior, kept] of Object.entries(responses)) {
      const change = kept ? 2.5 : -5;
      totalDelta += change;
      details.push({ behavior, change });
    }
  
    return { delta: totalDelta, details };
  }
  