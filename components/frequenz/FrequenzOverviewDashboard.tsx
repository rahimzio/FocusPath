
import React from "react";
import StepFormCurrent from "./StepFormCurrent";
import StepFormIdeal from "./StepFormIdeal";
import EveningReflectionCheck from "./EveningReflectionCheck";
import FrequencyDayChart from "./FrequencyDayChart";
import FrequencyRecommendations from "./FrequencyRecommendations";
import FrequencyReflection from "./FrequencyReflection";
import ReflectionHistory from "./ReflectionHistory";
import TrustTankBar from "./TrustTankBar";
import TrustTankHistoryChart from "./TrustTankHistoryChart";
import AffirmationAnchor from "./tools/AffirmationAnchor";
import FrequencyCompass from "./tools/FrequencyCompass";
import ManifestationProofLog from "./tools/ManifestationProofLog";
import MentalSceneLoop from "./tools/MentalSceneLoop";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSession } from "next-auth/react";

// Beispielhafte Daten als Platzhalter
const demoSnapshots = [
  { date: "2024-05-01", morningFrequency: 70, eveningFrequency: 65 },
  { date: "2024-05-02", morningFrequency: 68, eveningFrequency: 72 },
  { date: "2024-05-03", morningFrequency: 75, eveningFrequency: 70 },
  { date: "2024-05-04", morningFrequency: 80, eveningFrequency: 78 },
  { date: "2024-05-05", morningFrequency: 82, eveningFrequency: 79 },
  { date: "2024-05-06", morningFrequency: 85, eveningFrequency: 81 },
  { date: "2024-05-07", morningFrequency: 83, eveningFrequency: 84 },
];

const demoTrustHistory = [
  { date: "2024-05-01", delta: 2 },
  { date: "2024-05-02", delta: -1 },
  { date: "2024-05-03", delta: 3 },
  { date: "2024-05-04", delta: 1 },
];

const demoRecommendations = [
  {
    title: "Meditation",
    description: "Täglich 10 Minuten am Morgen meditieren",
    category: "Mindset" as const,
    gapReason: "Dein Stresslevel ist erhöht",
    basedOn: "self_belief",
  },
];

export default function FrequenzOverviewDashboard() {
  const { data: session } = useSession();
  const userId = (session as any)?.user?.id ?? "demo-user";
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-6 p-4">
      <h1 className="text-2xl font-semibold">Frequenz Dashboard</h1>
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Übersicht</TabsTrigger>
          <TabsTrigger value="components">Komponenten</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <FrequencyDayChart snapshots={demoSnapshots} />
            <TrustTankBar currentTrust={80} />
            <TrustTankHistoryChart history={demoTrustHistory} />
            <FrequencyRecommendations
              recommendations={demoRecommendations}
              userId={userId}
            />
            <FrequencyReflection
              userId={userId}
              date={today}
              timeOfDay="evening"
            />
            <ReflectionHistory userId={userId} />
          </div>
        </TabsContent>

        <TabsContent value="components">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <StepFormCurrent />
            <StepFormIdeal />
            <EveningReflectionCheck forbiddenBehaviors={[]} />
            <AffirmationAnchor userId={userId} />
            <FrequencyCompass
              current={{ mindset: 70, emotion: 65, behavior: 68, body: 72 }}
              ideal={{ mindset: 90, emotion: 90, behavior: 90, body: 90 }}
            />
            <ManifestationProofLog />
            <MentalSceneLoop />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
