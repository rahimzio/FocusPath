import React from "react";
import StepFormCurrent from "./StepFormCurrent";
import StepFormIdeal from "./StepFormIdeal";
import EveningReflectionCheck from "./EveningReflectionCheck";
import FrequencyDayChart from "./FrequencyDayChart";
import ConvictionCard from "./ConvictionCard";
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
    description: "Täglich 10 Minuten am Morgen meditieren",
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
    <div className="mx-auto max-w-screen-xl px-3 sm:px-4 lg:px-6 py-4 space-y-6">
      <h1 className="text-xl sm:text-2xl font-semibold">Frequenz Dashboard</h1>

      <Tabs defaultValue="overview" className="space-y-4">
        {/* TabsList mobil scrollbar, Desktop inline */}
        <TabsList className="w-full overflow-x-auto flex gap-2 sm:gap-3">
          <TabsTrigger value="overview" className="shrink-0">Übersicht</TabsTrigger>
          <TabsTrigger value="components" className="shrink-0">Komponenten</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          {/* 1 → 2 → 12 Spalten ab XL, mit gezielten col-spans */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-12 gap-4 sm:gap-6 min-w-0">
            <div className="col-span-1 md:col-span-2 xl:col-span-7 min-w-0">
              <FrequencyDayChart snapshots={demoSnapshots} />
            </div>

            <div className="col-span-1 md:col-span-2 xl:col-span-5 min-w-0">
              <TrustTankBar currentTrust={80} />
            </div>

            <div className="col-span-1 md:col-span-1 xl:col-span-6 min-w-0">
              <TrustTankHistoryChart history={demoTrustHistory} />
            </div>
            <ConvictionCard userId={userId} />

            <div className="col-span-1 md:col-span-1 xl:col-span-6 min-w-0">
              <FrequencyRecommendations
                recommendations={demoRecommendations}
                userId={userId}
              />
            </div>

            <div className="col-span-1 md:col-span-1 xl:col-span-6 min-w-0">
              <FrequencyReflection userId={userId} date={today} timeOfDay="evening" />
            </div>

            <div className="col-span-1 md:col-span-1 xl:col-span-6 min-w-0">
              <ReflectionHistory userId={userId} />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="components">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-12 gap-4 sm:gap-6 min-w-0">
            <div className="col-span-1 md:col-span-1 xl:col-span-6 min-w-0">
              <StepFormCurrent />
            </div>
            <div className="col-span-1 md:col-span-1 xl:col-span-6 min-w-0">
              <StepFormIdeal />
            </div>

            <div className="col-span-1 md:col-span-2 xl:col-span-4 min-w-0">
              <EveningReflectionCheck forbiddenBehaviors={[]} />
            </div>
            <div className="col-span-1 md:col-span-2 xl:col-span-4 min-w-0">
              <AffirmationAnchor userId={userId} />
            </div>
            <div className="col-span-1 md:col-span-2 xl:col-span-4 min-w-0">
              <ManifestationProofLog />
            </div>

            <div className="col-span-1 md:col-span-2 xl:col-span-6 min-w-0">
              <FrequencyCompass
                current={{ mindset: 70, emotion: 65, behavior: 68, body: 72 }}
                ideal={{ mindset: 90, emotion: 90, behavior: 90, body: 90 }}
              />
            </div>
            <div className="col-span-1 md:col-span-2 xl:col-span-6 min-w-0">
              <MentalSceneLoop />
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
