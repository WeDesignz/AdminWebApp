'use client';

import { useAuthStore } from '@/store/authStore';
import { ReactNode } from 'react';

interface PermissionWrapperProps {
  children: ReactNode;
  allowedRoles: string | string[];
  fallback?: ReactNode;
}

export function PermissionWrapper({
  children,
  allowedRoles,
  fallback = null,
}: PermissionWrapperProps) {
  const { hasRole } = useAuthStore();

  if (!hasRole(allowedRoles)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
