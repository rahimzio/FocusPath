// pages/api/frequency/overview.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { connectToDatabase } from '../db/connectToDatabase';
import { requireCollection } from '@/lib/requireCollection';

function toYMD(d = new Date()) {
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}
function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
  }
  try {
    const userId = String(req.query.userId || '');
    if (!userId) return res.status(400).json({ ok: false, error: 'Missing userId' });
    const date =
      typeof req.query.date === 'string' && /\d{4}-\d{2}-\d{2}/.test(req.query.date as string)
        ? String(req.query.date)
        : toYMD();

    const { db } = await connectToDatabase();
    const freqCol = await requireCollection<any>(db, 'frequency');
    const appData = await requireCollection<any>(db, 'appData');

    const frequency = await freqCol.findOne({ userId, type: 'frequency' });
    if (!frequency) return res.status(404).json({ ok: false, error: 'No frequency doc yet' });

    // Templates + heutige Instanzen → Preview
    const templates = Array.isArray(frequency.taskTemplates) ? frequency.taskTemplates : [];
    const todayInst = await appData.find({ userId, type: 'frequency_task', date }).toArray();
    const byName = new Map(todayInst.map((i: any) => [i.name, i]));

    let denom = 0,
      numer = 0;
    const todayTasks = templates.map((t: any) => {
      const w = Math.max(1, Number(t.points) || 1);
      denom += w;
      const inst = byName.get(t.name);
      if (inst?.status === 'done') numer += t.isDont ? -w : w;
      return { name: t.name, points: w, isDont: !!t.isDont, status: inst?.status || 'open' };
    });

    const frequencyToday = denom ? clamp((numer / denom) * 100, 0, 100) : 0;

    const baseConv = Math.max(0, Math.min(10, Number(frequency?.base?.baseConviction ?? 0)));
    const completionRatio = denom ? clamp(numer / denom, -1, 1) : 0;
    const k = Number(frequency?.smoothing?.kConv ?? 0.4);
    const convictionToday = clamp(
      baseConv + (completionRatio > 0 ? completionRatio * k : completionRatio * k * 0.5),
      0,
      10,
    );

    // Smoothed
    const metricsSmoothed = {
      frequencySmoothed: Number.isFinite(frequency?.metrics?.frequencySmoothed)
        ? Number(frequency.metrics.frequencySmoothed)
        : null,
      convictionSmoothed: Number.isFinite(frequency?.metrics?.convictionSmoothed)
        ? Number(frequency.metrics.convictionSmoothed)
        : null,
      lastUpdateDate: frequency?.metrics?.lastUpdateDate ?? null,
      mmState: frequency?.metrics?.mmState ?? null,
    };

    // Moods & Anchors
    const availableMoods: string[] = (frequency?.baseMoodPreferences || [])
      .map((p: any) => p?.label)
      .filter(Boolean);
    const frequencyAnchors = frequency?.frequencyAnchors || [];
    const concentrationAnchors = frequency?.concentrationAnchors || [];

    // Heutige Anchor-Checkins
    const anchorDocs = await appData.find({ userId, type: 'anchor_checkin', date, done: true }).toArray();
    const doneLabels = anchorDocs.map((a: any) => ({ label: a.label, type: a.anchorType }));

    // optionaler Tages-Summary
    const summary = await appData.findOne({ userId, type: 'frequency_daily_summary', date });

    // === NEU: Trends (vom Rollup berechnet & im frequency-Doc gespeichert) ===
    const trend = frequency?.trend || null;

    return res.status(200).json({
      ok: true,
      date,
      frequency,
      metrics: { ...frequency?.metrics },
      metricsSmoothed,
      todayPreview: { frequencyToday, convictionToday },
      templates,
      availableMoods,
      anchors: { frequencyAnchors, concentrationAnchors },
      anchorsToday: { doneLabels },
      todayTasks,
      summary,
      trend, // <- NEU: Δ7/Δ14 für freq/conviction
    });
  } catch (err: any) {
    console.error('[overview] error', err);
    return res.status(500).json({ ok: false, error: err?.message || 'Unknown error' });
  }
}
