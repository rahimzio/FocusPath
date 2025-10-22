import { } from "./shared";

// --- Finance: Basis & Kataloge ---

export type AccountType = "bank" | "broker" | "exchange" | "wallet";
export type AssetClass = "cash" | "crypto" | "stock" | "etf" | "other";

export type FinanceKind =
  | "income"
  | "expense"
  | "saving"
  | "saving_goal"
  | "account"
  | "transaction"
  | "symbol"          // Mapping für Preise (CoinGecko/Alpha Vantage)
  | "weekly_budget"   // falls genutzt
  | "price_snapshot"  // optional: tägliche Preise in derselben Collection
  | "price_latest"    // optional: letzter Preis je Symbol
  | "weekly_metrics"; // optional: wöchentliche KPIs

export interface FinanceBase {
  _id?: string;
  kind: FinanceKind;
  userId?: string;       // global=optional (z. B. symbol)
  createdAt: string;
  updatedAt: string;
  archived?: boolean;    // ⬅️ neu
  archivedAt?: string;
}

// --- Accounts & Portfolio ---

export interface PortfolioAccount {
  _id?: string;
  userId: string;
  name: string;            // z.B. "N26", "Binance Main", "Trade Republic"
  provider?: string;       // Freitext / App-Name
  type: AccountType;
  baseCurrency: string;    // z.B. "EUR"
  createdAt: string;
  updatedAt: string;
}

export interface FinanceAccount extends FinanceBase {
  kind: "account";
  userId: string;
  name: string;
  provider?: string;
  type: AccountType;
  baseCurrency: string; // "EUR" etc.
}

export type TransactionKind =
  | "cash_deposit" | "cash_withdrawal"
  | "asset_buy" | "asset_sell"
  | "asset_transfer_in" | "asset_transfer_out"
  | "cash_transfer_in" | "cash_transfer_out";

export interface FinanceTransaction extends FinanceBase {
  kind: "transaction";
  userId: string;
  accountId: string;     // _id von FinanceAccount (String)
  date: string;          // ISO
  transactionKind: TransactionKind;
  note?: string;

  // Asset-Daten (für asset_*)
  asset?: { class: AssetClass; symbol: string; name?: string };
  units?: number;        // bei asset_*
  pricePerUnit?: number; // bei asset_buy/sell
  fee?: number;          // optional, in Account-Währung
  cashAmount?: number;   // cash_* oder asset_* (Preis*Units +/- Fee)
}

export interface PortfolioTransaction {
  _id?: string;
  userId: string;
  accountId: string;
  date: string;            // ISO
  note?: string;
  kind:
    | "cash_deposit"
    | "cash_withdrawal"
    | "asset_buy"
    | "asset_sell"
    | "asset_transfer_in"
    | "asset_transfer_out"
    | "cash_transfer_in"
    | "cash_transfer_out";
  asset?: {
    class: AssetClass;
    symbol: string;       // "BTC", "AAPL", "VWCE"
    name?: string;
  };
  units?: number;
  pricePerUnit?: number;
  fee?: number;
  cashAmount?: number;
  createdAt: string;
  updatedAt: string;
}

// --- Kataloge & Preise ---

export interface FinanceSymbol extends FinanceBase {
  kind: "symbol";
  userId?: string; // null/global
  class: AssetClass;
  symbol: string;         // "BTC", "AAPL", "VWCE"
  name?: string;
  providers?: { coingeckoId?: string; alphaTicker?: string };
}

export interface FinancePriceSnapshot extends FinanceBase {
  kind: "price_snapshot";
  userId?: string;
  class: AssetClass | "fx";
  symbol: string;
  date: string;          // "YYYY-MM-DD" (Berlin)
  price: { eur?: number; usd?: number };
  provider: "coingecko" | "alphavantage";
  meta?: any;
}

export interface FinancePriceLatest extends FinanceBase {
  kind: "price_latest";
  userId?: string;
  class: AssetClass | "fx";
  symbol: string;
  asOfDate: string;      // "YYYY-MM-DD"
  price: { eur?: number; usd?: number };
  provider: string;
}

// --- Planung & KPIs ---

export interface FinanceSaving extends FinanceBase {
  kind: "saving";
  userId: string;
  month: string;       // "YYYY-MM"
  amount: number;
  note?: string;
}

export interface FinanceExpense extends FinanceBase {
  kind: "expense";
  userId: string;
  amount: number;
  dueDate: string;     // ISO
  category?: string;
  note?: string;
}

export interface FinanceIncome extends FinanceBase {
  kind: "income";
  userId: string;
  month: string;       // "YYYY-MM"
  amount: number;
  source?: string;
  note?: string;
}

export interface FinanceSavingGoal extends FinanceBase {
  kind: "saving_goal";
  userId: string;
  title: string;
  targetAmount: number;
  currentAmount: number;
  monthlyContribution?: number;
  deadline?: string;   // ISO (optional)
}

export interface FinanceWeeklyMetrics extends FinanceBase {
  kind: "weekly_metrics";
  userId: string;
  week: string;          // "YYYY-ww"
  savingRate: number;
  expenseGrowth: number;
  investmentROI: number;
  emergencyFund: { current: number; target: number };
  netWorth?: number;
}

// Union über mögliche Finance-Dokumente
export type FinanceDoc =
  | FinanceIncome | FinanceExpense | FinanceSaving | FinanceSavingGoal
  | FinanceAccount | FinanceTransaction | FinanceSymbol
  | FinancePriceSnapshot | FinancePriceLatest | FinanceWeeklyMetrics;

  // ... bestehende Finance-* Interfaces bleiben

// Lightweight App-Modelle (parallel zu FinanceSaving*, FinanceExpense etc.)
export interface SavingEntry {
  userId: string;
  month: string;           // "YYYY-MM"
  amount: number;
  note?: string;
  createdAt: string;       // ISO
  updatedAt: string;       // ISO
}

export interface SavingGoal {
  userId: string;
  title: string;
  targetAmount: number;
  currentAmount: number;
  monthlyContribution?: number;
  deadline?: string; // ISO oder ""
  createdAt: string;
  updatedAt: string;
  _id?: string;
}

// „expense“ kommt hier teils dupliziert vor — wir geben ein schlankes App-Modell:
export interface ExpenseEntry {
  _id?: string;
  userId?: string;
  name: string;
  amount: number;
  category: string;
  frequency: "daily" | "weekly" | "monthly" | "yearly" | string;
  dueDate: string;   // "YYYY-MM-DD"
  createdAt: string; // ISO
  updatedAt: string; // ISO
  note?: string;
}
export type expense = ExpenseEntry; // Backwards-Compat alias

export interface BudgetCategoryEntry {
  name: string;
  amount: number;
}

export interface BudgetEntry {
  _id?: string;
  userId: string;
  week: string; // "YYYY-ww"
  budget: number;
  spent: number;
  categories: BudgetCategoryEntry[];
  createdAt: string;
  updatedAt: string;
  rating?: "L" | "M" | "W" | "W+";
}

export interface IncomeEntry {
  userId: string;
  month: string; // "YYYY-MM"
  amount: number;
  note?: string;
  createdAt: string;
  updatedAt: string;
}
