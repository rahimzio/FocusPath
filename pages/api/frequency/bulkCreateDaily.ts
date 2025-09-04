import type { NextApiRequest as Req3, NextApiResponse as Res3 } from 'next';
import type { FrequencyDoc, FrequencyTaskTemplate, FrequencyTaskInstance } from '@/utils/interface';
import { requireCollection as requireCol3 } from '@/lib/requireCollection';
import { connectToDatabase } from '../db/connectToDatabase';

export default async function handlerBulkCreateDaily(req: Req3, res: Res3) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
  }

  try {
    const { userId, tasks } = req.body ?? {} as {
      userId?: string;
      tasks?: Array<{ name: string; points?: number; isDont: boolean; frequency: 'daily'; timebased?: boolean; category?: string; isFrequencyTask?: boolean; }>
    };

    if (!userId) return res.status(400).json({ ok: false, error: 'Missing userId' });
    if (!Array.isArray(tasks) || tasks.length === 0) {
      return res.status(400).json({ ok: false, error: 'No tasks to insert' });
    }

    const { db } = await connectToDatabase();
    const appData = await requireCol3<FrequencyTaskInstance>(db, 'appData');
    const freqCol = await requireCol3<FrequencyDoc>(db, 'frequency');

    const now = new Date();

    // 1) Insert instances in appData
    const docs: FrequencyTaskInstance[] = tasks
      .filter((t) => t?.name?.trim()?.length > 0)
      .map((t) => ({
        type: 'frequency_task',
        userId,
        name: t.name.trim(),
        points: Number.isFinite(t.points) ? Math.max(1, Math.min(10, Math.round(Number(t.points)))) : 1,
        isDont: !!t.isDont,
        frequency: 'daily',
        timebased: !!t.timebased,
        category: t.category || 'Frequenz',
        status: 'open',
        createdAt: now,
        updatedAt: now,
      }));

    if (docs.length === 0) return res.status(400).json({ ok: false, error: 'No valid tasks' });

    const insertRes = await appData.insertMany(docs, { ordered: false });

    // 2) Merge templates onto the frequency document (unique by name+isDont)
    //    We keep only lightweight templates in frequency to ease navigation
    const templates: FrequencyTaskTemplate[] = docs.map(d => ({ name: d.name, points: d.points, isDont: d.isDont }));

    // Merge logic: read current templates, then upsert unique set.
    const freqDoc = await freqCol.findOne({ userId, type: 'frequency' }, { projection: { taskTemplates: 1 } });
    const existing = new Map<string, FrequencyTaskTemplate>();
    (freqDoc?.taskTemplates ?? []).forEach(t => existing.set(`${t.name}__${t.isDont ? '1' : '0'}`, t));
    templates.forEach(t => existing.set(`${t.name}__${t.isDont ? '1' : '0'}`, t));

    const merged = Array.from(existing.values());
    await freqCol.updateOne(
      { userId, type: 'frequency' },
      { $set: { taskTemplates: merged, updatedAt: new Date() }, $setOnInsert: { createdAt: now, type: 'frequency', userId } },
      { upsert: true }
    );

    return res.status(200).json({ ok: true, insertedCount: insertRes.insertedCount, templateCount: merged.length });
  } catch (err: any) {
    console.error('[bulkCreateDaily] error', err);
    return res.status(500).json({ ok: false, error: err?.message || 'Failed to insert tasks' });
  }
}
