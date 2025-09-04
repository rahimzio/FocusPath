import type { Db, Collection } from 'mongodb';

export async function requireCollection<
  TSchema extends import('mongodb').Document = import('mongodb').Document
>(db: Db, name: string): Promise<Collection<TSchema>> {
  const exists = await db.listCollections({ name }).hasNext();
  if (!exists) {
    throw new Error(`Collection "${name}" does not exist. Create it first in Cosmos DB (Portal) or via migration.`);
  }
  return db.collection<TSchema>(name);
}
