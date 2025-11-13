import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';

/**
 * Hook to protect routes that require authentication
 * @param requireAuth - If true, redirects to login if not authenticated
 */
export function useAuth(requireAuth: boolean = true) {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (requireAuth && !isAuthenticated) {
      router.push('/login');
    }
  }, [requireAuth, isAuthenticated, router]);

  return { isAuthenticated };
}


