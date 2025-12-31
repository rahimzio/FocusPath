// components/trading/setup/setup-checklist.ts

import { SetupChecklistItem } from "@/utils/interface";


// 🔹 Default-Checklist für Entries (kannst du später konfigurierbar machen)
export const DEFAULT_ENTRY_CHECKLIST: SetupChecklistItem[] = [
  {
    id: "htf_align",
    label: "HTF-Bias stimmt mit Trade-Richtung überein",
    required: true,
  },
  {
    id: "at_level",
    label: "Preis ist an/nahe dem geplanten Key-Level",
    required: true,
  },
  {
    id: "no_news",
    label: "Keine High-Impact-News unmittelbar bevorstehend",
    required: false,
  },
  {
    id: "max_trades",
    label: "Tageslimit an Trades nicht überschritten",
    required: true,
  },
];
