// components/trading/setup/setup-api.ts

import { TradingSetup } from "@/utils/interface";

export async function createSetup(
  url: string,
  { arg }: { arg: any }
): Promise<TradingSetup> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(arg),
  });

  if (!res.ok) {
    throw new Error("Failed to create setup");
  }

  const data = await res.json();
  return data.setup as TradingSetup;
}

export async function updateSetup(
  url: string,
  { arg }: { arg: any }
): Promise<TradingSetup> {
  const res = await fetch(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ updates: arg }),
  });

  if (!res.ok) {
    throw new Error("Failed to update setup");
  }

  const data = await res.json();
  return data.setup as TradingSetup;
}
