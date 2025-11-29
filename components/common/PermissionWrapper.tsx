'use client';

import { useAuthStore } from '@/store/authStore';
import { ReactNode, useState, useEffect } from 'react';
import { Permission } from '@/lib/permissions/config';

interface PermissionWrapperProps {
  children: ReactNode;
  // Support both role-based and permission-based checks
  allowedRoles?: string | string[];
  requiredPermissions?: Permission | Permission[];
  requireAll?: boolean; // If true, requires ALL permissions; if false, requires ANY
  fallback?: ReactNode;
}

export function PermissionWrapper({
  children,
  allowedRoles,
  requiredPermissions,
  requireAll = false,
  fallback = null,
}: PermissionWrapperProps) {
  const { hasRole, hasPermission, hasAnyPermission, hasAllPermissions } = useAuthStore();
  const [mounted, setMounted] = useState(false);

  // Wait for component to mount to prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  // Before mount, show fallback to prevent hydration mismatch
  // This ensures server and client render the same initially
  if (!mounted) {
    return <>{fallback}</>;
  }

  // Check role-based permission
  if (allowedRoles && !hasRole(allowedRoles)) {
    return <>{fallback}</>;
  }

  // Check permission-based access
  if (requiredPermissions) {
    const permissionsArray = Array.isArray(requiredPermissions) 
      ? requiredPermissions 
      : [requiredPermissions];
    
    const hasAccess = requireAll
      ? hasAllPermissions(permissionsArray)
      : hasAnyPermission(permissionsArray);
    
    if (!hasAccess) {
      return <>{fallback}</>;
    }
  }

  return <>{children}</>;
}
