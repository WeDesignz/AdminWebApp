'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { useState, useEffect } from 'react';
import { useUIStore } from '@/store/uiStore';
import { useTokenRefresh } from '@/lib/hooks/useTokenRefresh';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
        refetchOnWindowFocus: false,
      },
    },
  }));

  // Proactive token refresh
  useTokenRefresh();

  useEffect(() => {
    // Ensure light theme is set by default and dark class is removed
    if (typeof window !== 'undefined') {
      const currentTheme = useUIStore.getState().theme;
      // Always remove dark class first
      document.documentElement.classList.remove('dark');
      // If theme is not set or is dark, set it to light
      if (!currentTheme || currentTheme === 'dark') {
        useUIStore.getState().setTheme('light');
      } else {
        // Ensure dark class is not present for light theme
        if (currentTheme === 'light') {
          document.documentElement.classList.remove('dark');
        }
      }
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster
        position="top-right"
        toastOptions={{
          className: 'glass',
          style: {
            background: 'var(--card-bg)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border)',
          },
        }}
      />
    </QueryClientProvider>
  );
}
