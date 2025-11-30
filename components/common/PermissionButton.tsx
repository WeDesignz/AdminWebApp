'use client';

import { Button, ButtonProps } from './Button';
import { PermissionWrapper } from './PermissionWrapper';
import { Permission } from '@/lib/permissions/config';
import { ReactNode } from 'react';

interface PermissionButtonProps extends ButtonProps {
  requiredPermission: Permission | Permission[];
  fallback?: ReactNode;
  requireAll?: boolean;
  children: ReactNode;
}

/**
 * Button component that only renders if user has the required permission(s)
 * Falls back to null or provided fallback if permission is missing
 */
export function PermissionButton({ 
  requiredPermission, 
  fallback = null,
  requireAll = false,
  children,
  ...buttonProps 
}: PermissionButtonProps) {
  return (
    <PermissionWrapper 
      requiredPermissions={requiredPermission}
      requireAll={requireAll}
      fallback={fallback}
    >
      <Button {...buttonProps}>
        {children}
      </Button>
    </PermissionWrapper>
  );
}


