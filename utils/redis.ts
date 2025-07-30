import { createClient } from "redis";

const client = createClient({ url: process.env.REDIS_URL });
client.on("error", (err: Error) => console.error("Redis Client Error", err.message));

let connected = false;
export async function getRedis() {
  if (!connected) {
    await client.connect();
    connected = true;
  }
  return client;
}

export async function getCached(key: string) {
  const c = await getRedis();
  const value = await c.get(key);
  return value ? JSON.parse(value) : null;
}

export async function setCached(key: string, data: any, ttl = 60) {
  const c = await getRedis();
  await c.set(key, JSON.stringify(data), { EX: ttl });
}