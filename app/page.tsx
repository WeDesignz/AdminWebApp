'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';

export default function Home() {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated } = useAuthStore();
  const [isHydrated, setIsHydrated] = useState(false);

  // Wait for Zustand store to hydrate from localStorage
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    // Only redirect if we're actually on the root path and store is hydrated
    // This prevents redirects when refreshing other pages
    if (isHydrated && pathname === '/') {
      if (isAuthenticated) {
        router.push('/dashboard');
      } else {
        router.push('/login');
      }
    }
  }, [isAuthenticated, router, pathname, isHydrated]);

  // Only render loading if we're on root path
  // This component should only be rendered for the root route
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
    </div>
  );
}
