/**
 * Permission Hook
 * 
 * Provides convenient methods to check permissions in components
 */

import { useAuthStore } from '@/store/authStore';

export function usePermission() {
  const { hasPermission, hasAnyPermission, hasAllPermissions, hasRole } = useAuthStore();

  return {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    hasRole,
  };
}

