import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';

/**
 * Hook to protect routes that require authentication
 * @param requireAuth - If true, redirects to login if not authenticated
 */
export function useAuth(requireAuth: boolean = true) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated } = useAuthStore();
  const [isHydrated, setIsHydrated] = useState(false);

  // Wait for Zustand store to hydrate from localStorage
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    // Only redirect after hydration to prevent redirects during page refresh
    if (isHydrated && requireAuth && !isAuthenticated) {
      // Only redirect if we're not already on the login page
      if (pathname !== '/login') {
        router.push('/login');
      }
    }
  }, [requireAuth, isAuthenticated, router, isHydrated, pathname]);

  return { isAuthenticated, isHydrated };
}


