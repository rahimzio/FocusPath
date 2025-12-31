// components/trading/trades/trade-api.ts
export interface TradeApiPayload {
  userId: string;
  date: string;
  symbol: string;
  direction: "long" | "short";
  entry: number;
  stopLoss: number;
  takeProfit?: number;
  exit?: number;
  positionSize: number;
  result?: "win" | "loss" | "BE";
  pnl?: number;
  rating?: number;

  displayName?: string;
  setupName?: string;
  groupName?: string;
  notes?: string;
  tags?: string[];
  setupId?: string;

  accountId?: string;
  source?: "manual" | "import_mt5" | "import_csv";
  status?: "inbox" | "journaled";
}

type FetcherArgs = { arg: TradeApiPayload };

export async function createTrade(url: string, { arg }: FetcherArgs) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(arg),
  });

  if (!res.ok) {
    console.error("Failed to create trade", await res.text());
    throw new Error("Failed to create trade");
  }

  const data = await res.json();
  return data.trade; // Erwartet { trade: TradeEntry } vom API-Handler
}

export async function updateTrade(url: string, { arg }: FetcherArgs) {
  const res = await fetch(url, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(arg),
  });

  if (!res.ok) {
    console.error("Failed to update trade", await res.text());
    throw new Error("Failed to update trade");
  }

  const data = await res.json();
  return data.trade;
}
