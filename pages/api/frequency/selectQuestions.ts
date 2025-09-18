// utils/frequenz/selectQuestions.ts
import type { BlockQuestion } from "./questionBankBlocks";

// kleine deterministische PRNG (ohne externe Libs)
function xmur3(str: string) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return function() {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return (h ^= h >>> 16) >>> 0;
  };
}
function mulberry32(a: number) {
  return function() {
    let t = (a += 0x6D2B79F5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function pickDailyQuestions(
  all: BlockQuestion[],
  date: string,     // YYYY-MM-DD
  userId: string,
  count = 5
): BlockQuestion[] {
  if (all.length <= count) return all;

  const seed = xmur3(`${userId}|${date}|freq`)();
  const rnd = mulberry32(seed);

  // gewichtete Liste (weight default 1 → 10 Duplikate pro Gewichtspunkt)
  const weighted: BlockQuestion[] = [];
  for (const q of all) {
    const w = Math.max(1, Math.round((q.weight ?? 1) * 10));
    for (let i = 0; i < w; i++) weighted.push(q);
  }

  const picked: BlockQuestion[] = [];
  const used = new Set<string>();
  while (picked.length < count && used.size < all.length) {
    const idx = Math.floor(rnd() * weighted.length);
    const q = weighted[idx];
    if (!used.has(q.id)) {
      used.add(q.id);
      picked.push(q);
    }
  }
  return picked;
}
