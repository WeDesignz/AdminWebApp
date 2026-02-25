'use client';

import dynamic from 'next/dynamic';
import { DashboardLayout } from '@/components/layout/DashboardLayout';

const ScheduledTasksClient = dynamic(
  () => import('./ScheduledTasksClient').then((m) => m.default),
  {
    ssr: false,
    loading: () => (
      <DashboardLayout>
        <div className="flex flex-1 items-center justify-center p-6">
          <p className="text-muted-foreground">Loading scheduled tasks…</p>
        </div>
      </DashboardLayout>
    ),
  }
);

export default function ScheduledTasksPage() {
  return <ScheduledTasksClient />;
}
