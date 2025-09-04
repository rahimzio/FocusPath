export type FrequencyRecommendation = {
  title: string;
  description: string;
  category: 'Mindset' | 'Körper' | 'Emotion' | 'Verhalten';
  gapReason: string;
  basedOn: string;
};

export function generateRecommendationsFromOverview(overview: any): FrequencyRecommendation[] {
  if (!overview?.frequency) return [];
  const r: FrequencyRecommendation[] = [];

  const base = overview.frequency.base || {};
  const models = overview.frequency.models || {};
  const metrics = overview.metrics || {};
  const summary = overview.summary || {};

  // a) Conviction-Gap
  const baseConv = Number(base.baseConviction ?? 0);
  const targetConv = Number(models?.ideal?.convictionTarget ?? 0);
  if (targetConv && baseConv < targetConv - 1) {
    r.push({
      title: 'Conviction erhöhen (Micro-Beweise)',
      description:
        'Wähle heute 1–2 Mini-Taten mit sicherem Abschluss (≤10 min) und feiere konsequent den Abschluss.',
      category: 'Mindset',
      gapReason: `Aktuell ${baseConv}/10, Ziel ${targetConv}/10.`,
      basedOn: 'conviction_gap',
    });
  }

  // b) Fehlende Ideal-Emotionen
  const emoNow: string[] = base.emotion || [];
  const emoIdeal: string[] = (models?.ideal?.desiredEmotions || []) as string[];
  const missingEmos = Array.from(new Set(emoIdeal.filter((e) => !emoNow.includes(e))));
  if (missingEmos.length) {
    r.push({
      title: 'Emotionen aktivieren',
      description: `Erzeuge heute gezielt ${missingEmos.join(
        ', '
      )} — z. B. durch Musik, Atem, Dankbarkeit, Bewegung.`,
      category: 'Emotion',
      gapReason: `Aktuell fehlen: ${missingEmos.join(', ')}`,
      basedOn: 'emotion_missing',
    });
  }

  // c) Focus-Leaks
  const leaks: string[] = base.focusLeaks || [];
  if (leaks.length) {
    r.push({
      title: 'Aufmerksamkeit abdichten',
      description:
        'Setze heute eine 25-min Deep-Work-Session ohne Benachrichtigungen und schließe mit kurzem Review ab.',
      category: 'Verhalten',
      gapReason: `Leaks erkannt: ${leaks.slice(0, 3).join(', ')}${leaks.length > 3 ? ' …' : ''}`,
      basedOn: 'focus_leaks',
    });
  }

  // d) Tages-Mood niedrig
  const lastMood = Number(metrics.lastDailyMoodScore ?? summary.moodAvg ?? 0);
  if (lastMood < 0) {
    r.push({
      title: 'Stimmung leicht anheben',
      description:
        '2× bewusste Atemrunde + 3× Dankbarkeit (30-60 Sek) + 5-Minuten-Start für die wichtigste Aufgabe.',
      category: 'Körper',
      gapReason: `Letzte Tagesstimmung unter 0 (aktuell ${lastMood.toFixed(2)}).`,
      basedOn: 'low_mood_today',
    });
  }

  // e) Alignment niedrig
  const align = Number(metrics.alignmentScore ?? 0);
  if (align && align < 60) {
    r.push({
      title: 'Handlungsauswahl vereinfachen',
      description:
        'Wähle eine Micro-Aktion, die 100% zu deiner Identität passt (\"so handle ich\"). Kein Multitasking.',
      category: 'Verhalten',
      gapReason: `Niedriger Alignment-Score (${Math.round(align)}).`,
      basedOn: 'low_alignment',
    });
  }

  // f) Wenn ideale Micro-Evidenzen vorhanden → Nudge
  const routine: string[] = (models?.ideal?.microEvidencePlan || []) as string[];
  if (routine?.length) {
    r.push({
      title: 'Eine Kernaktion heute',
      description: `Wähle 1 Routine aus: ${Array.from(new Set(routine)).slice(0, 3).join(', ')}${
        routine.length > 3 ? ' …' : ''
      }`,
      category: 'Verhalten',
      gapReason: 'Ideale Micro-Evidenzen vorhanden, heute eine konkret ausführen.',
      basedOn: 'micro_evidence_nudge',
    });
  }

  return r;
}
