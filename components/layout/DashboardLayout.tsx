'use client';

import { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { Navbar } from './Navbar';
import { useAuth } from '@/lib/hooks/useAuth';
import { useWebSocket } from '@/lib/hooks/useWebSocket';

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  // These hooks handle their own client-side logic
  // They don't cause conditional rendering, so no hydration mismatch
  useAuth(true);
  useWebSocket();

  // Use suppressHydrationWarning on the root div to prevent warnings
  // from Sidebar's mounted state logic
  return (
    <div className="flex h-screen overflow-hidden" suppressHydrationWarning>
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden" suppressHydrationWarning>
        <Navbar />
        <main className="flex-1 overflow-y-auto p-6 scrollbar-thin">
          {children}
        </main>
      </div>
    </div>
  );
}
