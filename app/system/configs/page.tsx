'use client';

import dynamic from 'next/dynamic';
import { DashboardLayout } from '@/components/layout/DashboardLayout';

// Import the actual page content component with SSR disabled to prevent hydration issues
const SystemConfigsPageContent = dynamic(
  () => import('./SystemConfigsPageContent'),
  {
    ssr: false,
    loading: () => (
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
    ),
  }
);

export default function SystemConfigsPage() {
  return <SystemConfigsPageContent />;
}
