import { TradeEntry } from "../../../../components/trading1/interface";

// components/trading1/trades/trade-api.ts
type CreateKey = string;
type UpdateKey = string;

export async function createTrade(
  url: CreateKey,
  { arg }: { arg: Partial<TradeEntry> & { userId: string } }
): Promise<TradeEntry> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(arg),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("createTrade error:", text);
    throw new Error("Failed to create trade");
  }

  const data = await res.json();
  return data.trade as TradeEntry;
}

export async function updateTrade(
  url: UpdateKey,
  { arg }: { arg: Partial<TradeEntry> & { userId: string } }
): Promise<TradeEntry> {
  const res = await fetch(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(arg),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("updateTrade error:", text);
    throw new Error("Failed to update trade");
  }

  const data = await res.json();
  return data.trade as TradeEntry;
}
