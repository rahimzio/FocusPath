'use client';

import * as React from 'react';
import EveningReflectionCheck from './EveningReflectionCheck';
import FrequencyDayChart from './FrequencyDayChart';
import ConvictionCard from './ConvictionCard';
import FrequencyRecommendations from './FrequencyRecommendations';
import FrequencyReflection from './FrequencyReflection';
import ReflectionHistory from './ReflectionHistory';
import TrustTankBar from './TrustTankBar';
import { TrustTankHistoryChart } from './TrustTankHistoryChart';
import AffirmationAnchor from './tools/AffirmationAnchor';
import FrequencyCompass from './tools/FrequencyCompass';
import ManifestationProofLog from './tools/ManifestationProofLog';
import MentalSceneLoop from './tools/MentalSceneLoop';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useSession } from 'next-auth/react';
import ResetAndOpenOnboarding from './resetOnboarding';
import FrequencySettingsButton from './FrequencySettingsButton';
import { BaseMoodCheckins } from './BaseMoodCheckins';
import { AddCustomMood } from './AddCustomMood';
import { AnchorsToday } from './AnchorsToday';
import { generateRecommendationsFromOverview } from './recommendations';
import TrendSparklines from './TrendSparklines';

export default function FrequenzOverviewDashboard() {
  const { data: session } = useSession();
  const userId = (session as any)?.user?.id ?? '';

  const today = new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 10);

  const [selectedDate, setSelectedDate] = React.useState<string>(today);
  const [overview, setOverview] = React.useState<any | null>(null);
  const [loadingOverview, setLoadingOverview] = React.useState(false);
  const [toggling, setToggling] = React.useState<string | null>(null);

  // Dev-Rollup UI-States
  const [rolling, setRolling] = React.useState(false);
  const [rollupMsg, setRollupMsg] = React.useState<string | null>(null);

  async function refreshOverview() {
    if (!userId) return;
    setLoadingOverview(true);
    try {
      const q = new URLSearchParams({ userId }).toString();
      const r = await fetch(`/api/frequency/overview?${q}`);
      const j = await r.json();
      if (j?.ok) setOverview(j);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingOverview(false);
    }
  }

  React.useEffect(() => {
    refreshOverview();
  }, [userId]);

  // abgeleitete Helfer
  const templates = (overview?.templates as any[]) || [];
  const todayTasks = (overview?.todayTasks as any[]) || [];
  const doTasks = todayTasks.filter((t) => !t.isDont);
  const dontTasks = todayTasks.filter((t) => t.isDont);

  const smoothed = overview?.metricsSmoothed || {};
  const preview = overview?.todayPreview || {};
  const trend = overview?.trend || null;
  const baseConviction = overview?.frequency?.base?.baseConviction;

  const dos = React.useMemo(
    () =>
      templates
        .filter((x: any) => !x.isDont)
        .map((x: any) => ({ name: x.name, points: x.points ?? 1 })),
    [templates]
  );
  const donts = React.useMemo(
    () =>
      templates
        .filter((x: any) => x.isDont)
        .map((x: any) => ({ name: x.name, points: x.points ?? 1 })),
    [templates]
  );

  const availableMoods: string[] = React.useMemo(() => {
    const prefs = overview?.availableMoods as string[] | undefined;
    return prefs && prefs.length
      ? prefs
      : ['ruhig', 'angespannt', 'klar', 'müde', 'fokussiert', 'gestresst'];
  }, [overview]);

  const frequencyAnchors =
    (overview?.anchors?.frequencyAnchors as Array<{ label: string }> | undefined) ??
    [];
  const concentrationAnchors =
    (overview?.anchors?.concentrationAnchors as Array<{ label: string }> | undefined) ??
    [];

  const recommendations = React.useMemo(
    () => generateRecommendationsFromOverview(overview),
    [overview]
  );

  async function toggleTask(t: {
    name: string;
    points: number;
    isDont: boolean;
    status: 'open' | 'done';
  }) {
    setToggling(t.name);
    try {
      const r = await fetch('/api/frequency/toggleTaskStatus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          name: t.name,
          points: t.points,
          isDont: t.isDont,
          done: t.status !== 'done',
        }),
      });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error || 'Fehler beim Speichern');

      // Live-Vorschau (persistente Glättung via Daily-Rollup)
      setOverview((prev: any) =>
        prev
          ? {
            ...prev,
            todayPreview: j.preview,
            todayTasks: prev.todayTasks.map((x: any) =>
              x.name === t.name
                ? { ...x, status: t.status === 'done' ? 'open' : 'done' }
                : x
            ),
          }
          : prev
      );
    } catch (e) {
      console.error(e);
    } finally {
      setToggling(null);
    }
  }

  // Dev-Button – Tages-Rollup (EWMA) anstoßen
  async function runDailyRollup() {
    if (!userId || rolling) return;
    setRolling(true);
    setRollupMsg(null);
    try {
      const url = `/api/cron/dailyRollup?userId=${encodeURIComponent(userId)}`;
      const res = await fetch(url, { method: 'GET' });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || `HTTP ${res.status}`);
      }
      setRollupMsg(`Rollup OK für ${data.date} · processed: ${data.processed}`);
      await refreshOverview();
    } catch (err: any) {
      console.error(err);
      setRollupMsg(`Rollup Fehler: ${err?.message || String(err)}`);
    } finally {
      setRolling(false);
    }
  }

  return (
    <div className="mx-auto max-w-screen-xl px-3 sm:px-4 lg:px-6 py-4 space-y-6">
      {/* HEADER */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl sm:text-2xl font-semibold">Frequenz Dashboard</h1>

        <div className="flex items-center gap-2">
          <button
            onClick={runDailyRollup}
            disabled={rolling}
            className={`px-3 py-2 rounded border ${rolling ? 'bg-gray-100 text-gray-500' : 'bg-white hover:bg-gray-50'
              }`}
            title="Tägliche Glättung (EWMA) jetzt berechnen"
          >
            {rolling ? 'Rollup…' : 'Tages-Rollup ausführen'}
          </button>
          <ResetAndOpenOnboarding userId={userId} />
          <FrequencySettingsButton />
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-700">Datum</label>
          <input
            type="date"
            className="border rounded px-2 py-1 text-sm"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          />
        </div>
      </div>

      {rollupMsg && <div className="text-xs text-gray-600 -mt-3">{rollupMsg}</div>}

      {/* SPARKLINES (Kurztrends) */}
      <div className="min-w-0">
        {userId && <TrendSparklines userId={userId} defaultDays={28} />}
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="w-full overflow-x-auto flex gap-2 sm:gap-3">
          <TabsTrigger value="overview" className="shrink-0">
            Übersicht
          </TabsTrigger>
          <TabsTrigger value="components" className="shrink-0">
            Komponenten
          </TabsTrigger>
        </TabsList>

        {/* ====== OVERVIEW TAB ====== */}
        <TabsContent value="overview">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-12 gap-4 sm:gap-6 min-w-0">
            {/* Tagesverlauf */}
            <div className="col-span-1 md:col-span-2 xl:col-span-7 min-w-0">
              {userId && (
                <FrequencyDayChart
                  userId={userId}
                  days={28}
                  onRunRollup={runDailyRollup}
                />
              )}
            </div>

            {/* Trust Tank / KPIs */}
            <div className="col-span-1 md:col-span-2 xl:col-span-5 min-w-0">
              <TrustTankBar
                baseConviction={baseConviction}
                smoothed={smoothed}
                preview={overview?.todayPreview}
                trend={overview?.trend}
              />
            </div>

            {/* Historie (echte Series) */}
            <div className="col-span-1 md:col-span-1 xl:col-span-6 min-w-0">
              {userId && (
                <TrustTankHistoryChart
                  userId={userId}
                  days={28}
                  onRunRollup={runDailyRollup}
                />
              )}
            </div>

            {/* Conviction Detailkarte */}
            <div className="col-span-1 md:col-span-1 xl:col-span-6 min-w-0">
              <ConvictionCard
                userId={userId}
                baseConviction={baseConviction}
                smoothed={smoothed}
                preview={overview?.todayPreview}
                trend={overview?.trend}
              />
            </div>

            {/* Empfehlungen */}
            <div className="col-span-1 md:col-span-1 xl:col-span-6 min-w-0">
              <FrequencyRecommendations
                recommendations={recommendations}
                userId={userId}
              />
            </div>

            {/* Reflektions-Historie */}
            <div className="col-span-1 md:col-span-1 xl:col-span-6 min-w-0">
              <ReflectionHistory userId={userId} />
            </div>
          </div>

          {/* Tägliche Aufgaben DO / DON'T */}
          <div className="rounded-xl border p-4 bg-white mt-4">
            <h3 className="text-base font-semibold mb-3">
              Tägliche Frequenz-Aufgaben
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="text-sm font-medium mb-2">DOs</div>
                <ul className="space-y-1">
                  {doTasks.length ? (
                    doTasks.map((t) => (
                      <li
                        key={`do-${t.name}`}
                        className="flex items-center justify-between rounded border px-2 py-1"
                      >
                        <label className="inline-flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            disabled={toggling !== null}
                            checked={t.status === 'done'}
                            onChange={() => toggleTask(t)}
                          />
                          <span
                            className={
                              t.status === 'done'
                                ? 'line-through text-gray-500'
                                : ''
                            }
                          >
                            {t.name}
                          </span>
                        </label>
                        <span className="text-xs text-gray-600">
                          +{t.points} P
                        </span>
                      </li>
                    ))
                  ) : (
                    <li className="text-sm text-gray-500">
                      Keine DOs angelegt
                    </li>
                  )}
                </ul>
              </div>

              <div>
                <div className="text-sm font-medium mb-2">DON’Ts</div>
                <ul className="space-y-1">
                  {dontTasks.length ? (
                    dontTasks.map((t) => (
                      <li
                        key={`dont-${t.name}`}
                        className="flex items-center justify-between rounded border px-2 py-1 ring-1 ring-red-300"
                      >
                        <label className="inline-flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            disabled={toggling !== null}
                            checked={t.status === 'done'}
                            onChange={() => toggleTask(t)}
                          />
                          <span
                            className={
                              t.status === 'done'
                                ? 'line-through text-red-500'
                                : ''
                            }
                          >
                            ⚠︎ {t.name}
                          </span>
                        </label>
                        <span className="text-xs text-red-600">
                          -{t.points} P
                        </span>
                      </li>
                    ))
                  ) : (
                    <li className="text-sm text-gray-500">
                      Keine DON’Ts angelegt
                    </li>
                  )}
                </ul>
              </div>
            </div>

            <div className="mt-3 text-xs text-gray-700">
              Heute:{' '}
              <b>
                {typeof overview?.todayPreview?.frequencyToday === 'number'
                  ? `${Math.round(overview.todayPreview.frequencyToday)}%`
                  : '—'}
              </b>{' '}
              · Conviction-Impuls:{' '}
              <b>
                {typeof overview?.todayPreview?.convictionToday === 'number'
                  ? overview.todayPreview.convictionToday.toFixed(1)
                  : '—'}
              </b>
            </div>
          </div>
        </TabsContent>

        {/* ====== COMPONENTS TAB (zeigt ALLE Bausteine in einem Bereich) ====== */}
        <TabsContent value="components">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-12 gap-4 sm:gap-6 min-w-0">
            {/* Evening Check */}
            <div className="col-span-1 md:col-span-2 xl:col-span-4 min-w-0">
              <EveningReflectionCheck
                userId={userId}
                date={selectedDate}
                forbiddenBehaviors={donts.map((d) => d.name)}
                dos={dos}
              />
            </div>

            {/* Affirmation / Proof / Scene */}
            <div className="col-span-1 md:col-span-2 xl:col-span-4 min-w-0">
              <AffirmationAnchor userId={userId} />
            </div>
            <div className="col-span-1 md:col-span-2 xl:col-span-4 min-w-0">
              <ManifestationProofLog />
            </div>

            {/* Kompass + Mental Loop */}
            <div className="col-span-1 md:col-span-2 xl:col-span-6 min-w-0">
              <FrequencyCompass
                current={{ mindset: 70, emotion: 65, behavior: 68, body: 72 }}
                ideal={{ mindset: 90, emotion: 90, behavior: 90, body: 90 }}
              />
            </div>
            <div className="col-span-1 md:col-span-2 xl:col-span-6 min-w-0">
              <MentalSceneLoop />
            </div>

            {/* Moods & Anchors */}
            <div className="col-span-1 md:col-span-2 xl:col-span-6 min-w-0">
              <AddCustomMood userId={userId} onAdded={refreshOverview} />
            </div>
            <div className="col-span-1 md:col-span-2 xl:col-span-6 min-w-0">
              <BaseMoodCheckins userId={userId} availableMoods={availableMoods} />
            </div>
            <div className="col-span-1 md:col-span-2 xl:col-span-12 min-w-0">
              <AnchorsToday
                userId={userId}
                frequencyAnchors={frequencyAnchors}
                concentrationAnchors={concentrationAnchors}
              />
            </div>

            {/* Empfehlungen + Historie ebenfalls HIER, damit "alle Komponenten" wirklich in einem Bereich sind */}
            <div className="col-span-1 md:col-span-2 xl:col-span-6 min-w-0">
              <FrequencyRecommendations recommendations={recommendations} userId={userId} />
            </div>
            <div className="col-span-1 md:col-span-2 xl:col-span-6 min-w-0">
              <ReflectionHistory userId={userId} />
            </div>

            {/* gezielte Eingabe-Reflexion */}
            <div className="col-span-1 md:col-span-2 xl:col-span-6 min-w-0">
              <FrequencyReflection userId={userId} date={today} timeOfDay="evening" />
            </div>

            {loadingOverview && (
              <div className="col-span-12 text-xs text-gray-500">Lade Übersicht…</div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
