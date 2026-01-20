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

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    throw new Error(data?.message ?? "Failed to create setup");
  }

  return data.setup as TradingSetup;
}

export async function updateSetup(
  url: string,
  { arg }: { arg: any }
): Promise<TradingSetup> {
  const res = await fetch(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    // ✅ API erwartet payload (und akzeptiert auch updates/direkt)
    body: JSON.stringify({ payload: arg }),
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    // ✅ echte Fehlermeldung vom Server
    throw new Error(data?.message ?? "Failed to update setup");
  }

  return data.setup as TradingSetup;
}
