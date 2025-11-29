import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Admin } from '@/types';
import { Permission, MODERATOR_DEFAULT_PERMISSIONS } from '@/lib/permissions/config';

interface AuthState {
  admin: Admin | null;
  permissions: Permission[];
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  requires2FA: boolean;
  tempEmail: string | null;
  setAdmin: (admin: Admin, permissions?: Permission[]) => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
  setRequires2FA: (requires: boolean, email?: string) => void;
  setPermissions: (permissions: Permission[]) => void;
  logout: () => void;
  hasRole: (role: string | string[]) => boolean;
  hasPermission: (permission: Permission) => boolean;
  hasAnyPermission: (permissions: Permission[]) => boolean;
  hasAllPermissions: (permissions: Permission[]) => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      admin: null,
      permissions: [],
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      requires2FA: false,
      tempEmail: null,

      setAdmin: (admin, permissions) => {
        // If permissions not provided, use defaults based on role
        let userPermissions: Permission[] = [];
        
        if (admin.role === 'Super Admin') {
          // Super Admin has all permissions (checked dynamically)
          userPermissions = [];
        } else if (admin.role === 'Moderator') {
          // Use provided permissions or defaults
          userPermissions = permissions || MODERATOR_DEFAULT_PERMISSIONS;
        }
        
        set({
          admin,
          permissions: userPermissions,
          isAuthenticated: true,
          requires2FA: false,
          tempEmail: null,
        });
      },

      setTokens: (accessToken, refreshToken) =>
        set({ accessToken, refreshToken }),

      setRequires2FA: (requires, email) =>
        set({ requires2FA: requires, tempEmail: email || null }),

      setPermissions: (permissions) =>
        set({ permissions }),

      logout: () =>
        set({
          admin: null,
          permissions: [],
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
          requires2FA: false,
          tempEmail: null,
        }),

      hasRole: (role) => {
        const { admin } = get();
        if (!admin) return false;
        if (Array.isArray(role)) {
          return role.includes(admin.role);
        }
        return admin.role === role;
      },

      hasPermission: (permission) => {
        const { admin, permissions } = get();
        if (!admin) return false;
        
        // Super Admin has all permissions
        if (admin.role === 'Super Admin') {
          return true;
        }
        
        // Check if moderator has the permission
        return permissions.includes(permission);
      },

      hasAnyPermission: (permissionsToCheck) => {
        const { admin, permissions } = get();
        if (!admin) return false;
        
        if (admin.role === 'Super Admin') {
          return true;
        }
        
        return permissionsToCheck.some(perm => permissions.includes(perm));
      },

      hasAllPermissions: (permissionsToCheck) => {
        const { admin, permissions } = get();
        if (!admin) return false;
        
        if (admin.role === 'Super Admin') {
          return true;
        }
        
        return permissionsToCheck.every(perm => permissions.includes(perm));
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        admin: state.admin,
        permissions: state.permissions,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
