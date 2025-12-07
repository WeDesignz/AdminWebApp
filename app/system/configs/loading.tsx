'use client';

import { DashboardLayout } from '@/components/layout/DashboardLayout';

export default function Loading() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">System Configuration</h1>
            <p className="text-muted mt-1">Manage system-wide settings and configurations</p>
          </div>
        </div>
        <div className="card">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary mx-auto"></div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

