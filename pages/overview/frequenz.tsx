// pages/frequenz.tsx
import dynamic from 'next/dynamic';
import React from 'react';
import FrequenzGate from '@/components/frequenz/FrequenzGate';

const FrequenzOverviewDashboard = dynamic(
  () => import('@/components/frequenz/FrequenzOverviewDashboard'),
  { loading: () => <p>Loading...</p>, ssr: false }
);

export default function FrequenzPage() {
  return (
    <React.Suspense fallback={<div>Loading...</div>}>
      <FrequenzGate>
        <FrequenzOverviewDashboard />
      </FrequenzGate>
    </React.Suspense>
  );
}
