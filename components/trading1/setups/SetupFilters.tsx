"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { TradingSetup } from "../interface";

export interface SetupFiltersProps {
  setups: TradingSetup[];
  onFilterChange: (filtered: TradingSetup[]) => void;
}

const SetupFilters: React.FC<SetupFiltersProps> = ({ setups, onFilterChange }) => {
  const [search, setSearch] = React.useState("");
  const [marketFilter, setMarketFilter] = React.useState<string>("all");
  const [directionFilter, setDirectionFilter] = React.useState<string>("all");

  const markets = React.useMemo(() => {
    return Array.from(new Set(setups.map((s) => s.market).filter(Boolean))) as string[];
  }, [setups]);

  React.useEffect(() => {
    const normalizedSearch = search.trim().toLowerCase();

    const filtered = setups.filter((s) => {
      if (normalizedSearch) {
        const haystack = `${s.market ?? ""} ${s.setupLabel ?? ""} ${s.patternType ?? ""}`.toLowerCase();
        if (!haystack.includes(normalizedSearch)) return false;
      }

      if (marketFilter !== "all" && s.market !== marketFilter) return false;
      if (directionFilter !== "all" && s.direction !== directionFilter) return false;

      return true;
    });

    onFilterChange(filtered);
  }, [setups, search, marketFilter, directionFilter, onFilterChange]);

  function handleReset() {
    setSearch("");
    setMarketFilter("all");
    setDirectionFilter("all");
  }

  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-1 flex-col gap-3 md:flex-row md:items-center">
            <Input
              placeholder="Suche nach Markt / Setup / Pattern..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="md:max-w-xs"
            />

            <Select value={marketFilter} onValueChange={setMarketFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Markt" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle Märkte</SelectItem>
                {markets.map((mkt) => (
                  <SelectItem key={mkt} value={mkt}>
                    {mkt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={directionFilter} onValueChange={setDirectionFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Richtung" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Long & Short</SelectItem>
                <SelectItem value="long">Long</SelectItem>
                <SelectItem value="short">Short</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button variant="outline" size="sm" onClick={handleReset}>
            Filter zurücksetzen
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default SetupFilters;
