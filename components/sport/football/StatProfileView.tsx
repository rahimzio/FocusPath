import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectItem, SelectTrigger, SelectContent, SelectValue } from "@/components/ui/select";
import { FootballStatProfile } from "@/utils/sport/stats";
import StatRadarChart from "./StatRadarChart";
import StatBlock from "./StatBlock";
import StatHistoryChart from "./StatHistoryChart";
interface Props {
  profile: FootballStatProfile;
}

const StatProfileView = ({ profile }: Props) => {
  const [selected, setSelected] = useState<number>(-1);
  const historyOptions = profile.history || [];
  const historyEntry = selected >= 0 ? historyOptions[selected] : undefined;

  return (
    <div className="space-y-6">
      <StatRadarChart current={profile} compareTo={historyEntry?.snapshot} />

      {historyOptions.length > 0 && (
        <Select onValueChange={(v) => setSelected(parseInt(v, 10))}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Vergleich" />
          </SelectTrigger>
          <SelectContent>
            {historyOptions.map((h, idx) => (
              <SelectItem key={idx} value={String(idx)}>
                {h.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      <Tabs defaultValue="speed" className="w-full">
        <TabsList className="grid grid-cols-2 w-full mb-4">
          <TabsTrigger value="speed">Speed</TabsTrigger>
          <TabsTrigger value="endurance">Ausdauer</TabsTrigger>
        </TabsList>
        <TabsContent value="speed" className="space-y-4">
          <StatBlock name="Explosivkraft" value={profile.speed.sprint.level} />
          <StatHistoryChart
            statKey="speed.sprint.level"
            history={profile.history}
            currentValue={profile.speed.sprint.level}
          />
        </TabsContent>
        <TabsContent value="endurance" className="space-y-4">
          <StatBlock name="Cooper-Test" value={profile.endurance.cooper.level} />
          <StatHistoryChart
            statKey="endurance.cooper.level"
            history={profile.history}
            currentValue={profile.endurance.cooper.level}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default StatProfileView;