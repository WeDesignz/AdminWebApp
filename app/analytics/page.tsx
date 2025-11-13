'use client';

import { DashboardLayout } from '@/components/layout/DashboardLayout';

export default function AnalyticsPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Analytics</h1>
          <p className="text-muted mt-1">Advanced analytics and insights</p>
        </div>
        
        <div className="card text-center py-12">
          <p className="text-muted">Analytics dashboards coming soon</p>
        </div>
      </div>
    </DashboardLayout>
  );
}
