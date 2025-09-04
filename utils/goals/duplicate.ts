import type { NextApiRequest, NextApiResponse } from 'next';
// import { db } from '@/lib/db';
// import { ObjectId } from 'mongodb';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end('Method Not Allowed');
  }

  try {
    const { goalId } = req.body as { goalId: string };
    // const orig = await db.collection('goals').findOne({ _id: new ObjectId(goalId) });
    // if (!orig) return res.status(404).json({ error: 'not found' });

    // const copy = { ...orig, _id: undefined, title: `${orig.title} (Kopie)`, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    // const { insertedId } = await db.collection('goals').insertOne(copy);
    // const goal = { ...copy, _id: insertedId };

    const goal = { _id: 'temp-id', title: 'Demo (Kopie)', progress: 0 }; // <— Placeholder
    return res.status(200).json({ goal });
  } catch (e:any) {
    return res.status(500).json({ error: e?.message || 'duplicate failed' });
  }
}
