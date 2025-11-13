import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Admin } from '@/types';

interface AuthState {
  admin: Admin | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  requires2FA: boolean;
  tempEmail: string | null;
  setAdmin: (admin: Admin) => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
  setRequires2FA: (requires: boolean, email?: string) => void;
  logout: () => void;
  hasRole: (role: string | string[]) => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      admin: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      requires2FA: false,
      tempEmail: null,

      setAdmin: (admin) =>
        set({
          admin,
          isAuthenticated: true,
          requires2FA: false,
          tempEmail: null,
        }),

      setTokens: (accessToken, refreshToken) =>
        set({ accessToken, refreshToken }),

      setRequires2FA: (requires, email) =>
        set({ requires2FA: requires, tempEmail: email || null }),

      logout: () =>
        set({
          admin: null,
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
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        admin: state.admin,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
