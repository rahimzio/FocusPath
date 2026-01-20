// components/trading/setup/setup-checklist.ts

import { SetupChecklistItem } from "@/utils/interface";


// 🔹 Default-Checklist für Entries (kannst du später konfigurierbar machen)
export const DEFAULT_ENTRY_CHECKLIST: SetupChecklistItem[] = [
  {
    id: "1",
    label: "price is above indication level",
    required: false,
  },
  {
    id: "2",
    label: "Daily || 4H || 1H are aligned",
    required: true,
  },
  {
    id: "3",
    label: "Keine High-Impact-News unmittelbar bevorstehend",
    required: true,
  },
  {
    id: "max_trades",
    label: "Tageslimit an Trades nicht überschritten",
    required: true,
  },
];
