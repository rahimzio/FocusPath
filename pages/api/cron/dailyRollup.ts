// pages/api/cron/dailyRollup.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { connectToDatabase } from '../db/connectToDatabase';
import { requireCollection } from '@/lib/requireCollection';

function toYMD(d = new Date()) {
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}
function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}
function addDays(ymd: string, delta: number) {
  const d = new Date(ymd + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + delta);
  return toYMD(d);
}
function avg(nums: number[]) {
  return nums.length ? nums.reduce((s, x) => s + x, 0) / nums.length : NaN;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
  }

  try {
    const { db } = await connectToDatabase();
    const appData = await requireCollection<any>(db, 'appData');
    const freqCol = await requireCollection<any>(db, 'frequency');

    const userFilter = req.query.userId ? { userId: String(req.query.userId) } : {};

    // Rollup für den VORTAG (lokal -> YMD-String, lexikalisch sortierbar)
    const prev = new Date(Date.now() - 24 * 3600 * 1000);
    const date = toYMD(prev);

    // Kandidaten: alle User mit Aktivität am Vortag (Tasks/Moods/Anchors)
    const usersAgg = await appData
      .aggregate([
        {
          $match: {
            date,
            type: { $in: ['frequency_task', 'frequency_baseMood_log', 'anchor_checkin'] },
            ...userFilter,
          },
        },
        { $group: { _id: '$userId' } },
      ])
      .toArray();
    const userIds: string[] = usersAgg.map((u: any) => u._id);

    let processed = 0;

    for (const userId of userIds) {
      const freqDoc = await freqCol.findOne({ userId, type: 'frequency' });
      if (!freqDoc) continue;

      const templates = Array.isArray(freqDoc.taskTemplates) ? freqDoc.taskTemplates : [];
      const inst = await appData.find({ userId, type: 'frequency_task', date }).toArray();
      const instByName = new Map<string, any>(inst.map((i: any) => [i.name, i]));

      // Tages-Taskscore
      let denom = 0,
        numer = 0;
      for (const t of templates) {
        const w = Math.max(1, Number(t.points) || 1);
        denom += w;
        const i = instByName.get(t.name);
        if (i?.status === 'done') numer += t.isDont ? -w : w;
      }
      const frequencyToday = denom ? clamp((numer / denom) * 100, 0, 100) : 0;

      // Mood/Anchor (optional)
      const [moods, anchors] = await Promise.all([
        appData.find({ userId, type: 'frequency_baseMood_log', date }).toArray(),
        appData.find({ userId, type: 'anchor_checkin', date, done: true }).toArray(),
      ]);
      const moodAvg = moods.length ? moods.reduce((s: number, m: any) => s + (m.score || 0), 0) / moods.length : 0;

      // Conviction-Target (kleiner Tagesimpuls um Baseline)
      const baseConv = Math.max(0, Math.min(10, Number(freqDoc?.base?.baseConviction ?? 0)));
      const completionRatio = denom ? clamp(numer / denom, -1, 1) : 0;

      const cfg = freqDoc.smoothing ?? {
        windowDays: 14,
        alpha: 0.12,
        maxDailyStep: { freqPct: 4, convPts: 0.1 },
        kConv: 0.4,
        magnifyAlphaBoost: 0.15,
        magnifyStreakThreshold: 7,
      };

      // Maintain/Magnify-State
      const mmState = freqDoc.metrics?.mmState ?? { mode: 'maintain', streakPos: 0, streakNeg: 0 };
      const positiveDay = completionRatio >= 0.2 || frequencyToday >= 55;
      const negativeDay = completionRatio <= -0.2 || frequencyToday <= 45;
      const nextStreakPos = positiveDay ? mmState.streakPos + 1 : 0;
      const nextStreakNeg = negativeDay ? mmState.streakNeg + 1 : 0;
      const nextMode: 'maintain' | 'magnify' =
        nextStreakPos >= cfg.magnifyStreakThreshold ? 'magnify' : 'maintain';

      // α an Modus anpassen
      const alphaBase = cfg.alpha;
      const alpha = nextMode === 'magnify' ? alphaBase * (1 + cfg.magnifyAlphaBoost) : alphaBase;

      const targetConviction = clamp(
        baseConv + (completionRatio > 0 ? completionRatio * cfg.kConv : completionRatio * cfg.kConv * 0.5),
        0,
        10,
      );

      const prevFreq = Number.isFinite(freqDoc.metrics?.frequencySmoothed)
        ? Number(freqDoc.metrics.frequencySmoothed)
        : frequencyToday;
      const prevConv = Number.isFinite(freqDoc.metrics?.convictionSmoothed)
        ? Number(freqDoc.metrics.convictionSmoothed)
        : baseConv;

      // EWMA Schritt
      let freqNext = prevFreq + alpha * (frequencyToday - prevFreq);
      let convNext = prevConv + alpha * (targetConviction - prevConv);

      // Caps
      if (Math.abs(freqNext - prevFreq) > cfg.maxDailyStep.freqPct) {
        freqNext = prevFreq + Math.sign(freqNext - prevFreq) * cfg.maxDailyStep.freqPct;
      }
      if (Math.abs(convNext - prevConv) > cfg.maxDailyStep.convPts) {
        convNext = prevConv + Math.sign(convNext - prevConv) * cfg.maxDailyStep.convPts;
      }

      // Tages-Summary persistieren (inkl. convTarget für spätere Trend-Berechnung)
      await appData.updateOne(
        { userId, type: 'frequency_daily_summary', date },
        {
          $set: {
            userId,
            type: 'frequency_daily_summary',
            date,
            taskScore: frequencyToday, // 0..100
            moodAvg, // -1..+1 (aus Base-Mood-Prefs)
            convTarget: targetConviction, // 0..10
            updatedAt: new Date(),
          },
          $setOnInsert: { createdAt: new Date() },
        },
        { upsert: true },
      );

      // Glättungs-Metriken speichern
      await freqCol.updateOne(
        { userId, type: 'frequency' },
        {
          $set: {
            'metrics.frequencySmoothed': Math.round(freqNext * 100) / 100,
            'metrics.convictionSmoothed': Math.round(convNext * 10) / 10,
            'metrics.lastUpdateDate': date,
            'metrics.mmState': { mode: nextMode, streakPos: nextStreakPos, streakNeg: nextStreakNeg },
            'metrics.lastDailyMoodScore': moodAvg,
            'metrics.updatedAt': new Date(),
            'metrics.frequencyScore': frequencyToday,
          },
          $setOnInsert: { smoothing: cfg },
        },
      );

      // === NEU: Δ7 / Δ14 Trends berechnen (rollierender Vergleich) ===========
      // Δ7: Durchschnitt der letzten 7 Tage (inkl. date) minus der 7 Tage davor
      // Δ14: Durchschnitt der letzten 14 Tage minus der 14 Tage davor
      const dEnd = date;
      const d7Start = addDays(dEnd, -6);
      const d7PrevStart = addDays(dEnd, -13);
      const d14Start = addDays(dEnd, -13);
      const d14PrevStart = addDays(dEnd, -27);

      // letzten 28 Tage laden
      const d28Start = addDays(dEnd, -27);
      const summaries = await appData
        .find({
          userId,
          type: 'frequency_daily_summary',
          date: { $gte: d28Start, $lte: dEnd }, // Strings im Format YYYY-MM-DD sind lexik. sortierbar
        })
        .project({ date: 1, taskScore: 1, convTarget: 1, _id: 0 })
        .toArray();

      // in Maps für schnellen Zugriff
      const mapTask = new Map<string, number>();
      const mapConv = new Map<string, number>();
      for (const s of summaries) {
        if (typeof s.taskScore === 'number') mapTask.set(s.date, s.taskScore);
        if (typeof s.convTarget === 'number') mapConv.set(s.date, s.convTarget);
      }

      function collectRange(start: string, end: string, mapper: Map<string, number>) {
        const arr: number[] = [];
        let cursor = start;
        while (cursor <= end) {
          const v = mapper.get(cursor);
          if (typeof v === 'number') arr.push(v);
          cursor = addDays(cursor, 1);
        }
        return arr;
      }

      const last7_freq = collectRange(d7Start, dEnd, mapTask);
      const prev7_freq = collectRange(d7PrevStart, addDays(d7Start, -1), mapTask);
      const last14_freq = collectRange(d14Start, dEnd, mapTask);
      const prev14_freq = collectRange(d14PrevStart, addDays(d14Start, -1), mapTask);

      const last7_conv = collectRange(d7Start, dEnd, mapConv);
      const prev7_conv = collectRange(d7PrevStart, addDays(d7Start, -1), mapConv);
      const last14_conv = collectRange(d14Start, dEnd, mapConv);
      const prev14_conv = collectRange(d14PrevStart, addDays(d14Start, -1), mapConv);

      const d7_freq =
        last7_freq.length && prev7_freq.length ? Math.round((avg(last7_freq) - avg(prev7_freq)) * 10) / 10 : null;
      const d14_freq =
        last14_freq.length && prev14_freq.length ? Math.round((avg(last14_freq) - avg(prev14_freq)) * 10) / 10 : null;

      const d7_conv =
        last7_conv.length && prev7_conv.length ? Math.round((avg(last7_conv) - avg(prev7_conv)) * 10) / 10 : null;
      const d14_conv =
        last14_conv.length && prev14_conv.length ? Math.round((avg(last14_conv) - avg(prev14_conv)) * 10) / 10 : null;

      await freqCol.updateOne(
        { userId, type: 'frequency' },
        {
          $set: {
            trend: {
              freq: { d7: d7_freq, d14: d14_freq }, // %-Punkte
              conviction: { d7: d7_conv, d14: d14_conv }, // Punkte /10
              lastComputed: date,
            },
          },
        },
      );

      // ======================================================================

      processed++;
    }

    return res.status(200).json({ ok: true, date, processed });
  } catch (err: any) {
    console.error('[dailyRollup] error', err);
    return res.status(500).json({ ok: false, error: err?.message || 'Unknown error' });
  }
}
