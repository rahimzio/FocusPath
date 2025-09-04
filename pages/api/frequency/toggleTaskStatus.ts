import type { NextApiRequest, NextApiResponse } from 'next';
import { connectToDatabase } from '../db/connectToDatabase'; // ggf. Pfad anpassen
import { requireCollection } from '@/lib/requireCollection';

function toYMD(d = new Date()) {
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 10);
}
function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
  }
  try {
    const { userId, name, points, isDont, done } = req.body ?? {};
    if (!userId || !name || typeof isDont !== 'boolean' || !Number.isFinite(points)) {
      return res
        .status(400)
        .json({ ok: false, error: 'Missing fields: userId, name, isDont:boolean, points:number' });
    }

    const { db } = await connectToDatabase();
    const appData = await requireCollection<any>(db, 'appData');
    const freqCol = await requireCollection<any>(db, 'frequency');

    const now = new Date();
    const date = toYMD(now);

    // 1) Task-Instanz für HEUTE upserten (Status toggeln)
    await appData.updateOne(
      { userId, type: 'frequency_task', date, name },
      {
        $setOnInsert: {
          userId,
          type: 'frequency_task',
          date,
          name,
          points,
          isDont,
          frequency: 'daily',
          timebased: false,
          category: 'Frequenz',
          createdAt: now,
        },
        $set: { status: done ? 'done' : 'open', updatedAt: now },
      },
      { upsert: true }
    );

    // 2) PREVIEW (heute) berechnen – NICHT persistieren
    const freqDoc = await freqCol.findOne(
      { userId, type: 'frequency' },
      { projection: { taskTemplates: 1, base: 1 } }
    );
    const templates: Array<{ name: string; points: number; isDont: boolean }> = Array.isArray(
      freqDoc?.taskTemplates
    )
      ? (freqDoc!.taskTemplates as any[])
      : [];

    const instances = await appData.find({ userId, type: 'frequency_task', date }).toArray();
    const instByName = new Map<string, any>(instances.map((i: any) => [i.name, i]));

    let denom = 0,
      numer = 0;
    for (const t of templates) {
      const w = Math.max(1, Number(t.points) || 1);
      denom += w;
      const inst = instByName.get(t.name);
      if (inst?.status === 'done') numer += t.isDont ? -w : w;
    }

    const frequencyToday = denom ? clamp((numer / denom) * 100, 0, 100) : 0;

    const baseConv = Math.max(0, Math.min(10, Number(freqDoc?.base?.baseConviction ?? 0)));
    const completionRatio = denom ? clamp(numer / denom, -1, 1) : 0;
    const k = 0.4; // sehr kleiner Tagesimpuls
    const convictionToday = clamp(
      baseConv + (completionRatio > 0 ? completionRatio * k : completionRatio * k * 0.5),
      0,
      10
    );

    return res.status(200).json({ ok: true, preview: { frequencyToday, convictionToday } });
  } catch (err: any) {
    console.error('[toggleTaskStatus] error', err);
    return res.status(500).json({ ok: false, error: err?.message || 'Unknown error' });
  }
}
